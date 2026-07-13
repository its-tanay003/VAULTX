import { createClient } from "@/lib/supabase/server";
import { streamClaude } from "@/lib/ai/claude";
import {
  buildSystemPrompt, gatherContextData, detectDataQueryMetric, fetchDataForQuery,
  type VaultContext,
} from "@/lib/ai/vault-agent";
import { validateProposedAction } from "@/lib/ai/vault-actions";
import { validateCsrf } from "@/lib/api/csrf";
import type { UserRole } from "@/lib/supabase/types";

export const runtime = "nodejs";

/**
 * POST /api/vault/chat
 *
 * Body: { message: string, conversationId?: string, context?: VaultContext }
 * Streams the assistant's response as plain text chunks (not SSE
 * framing — this is a same-origin fetch consumed by our own widget,
 * so raw chunked text is simpler and sufficient). Persists both the
 * user message and the full assembled response once the stream
 * completes.
 */
export async function POST(request: Request) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => null);
  const message: string | undefined = body?.message;
  const context: VaultContext = body?.context ?? {};
  let conversationId: string | undefined = body?.conversationId;

  const { data: profile } = await supabase.from("profiles").select("role, org_id, vault_agent_mode_enabled, vault_response_style").eq("id", user.id).single();
  const realRole: UserRole = profile?.role ?? "researcher";
  const role: "researcher" | "admin" = realRole === "researcher" ? "researcher" : "admin";
  const orgId = profile?.org_id;

  // 1. Quota Check: enforce monthly AI requests
  if (orgId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: monthlyMsgCount } = await supabase
      .from("vault_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", startOfMonth);

    const { checkEntitlement } = await import("@/lib/billing/entitlements");
    const { allowed } = await checkEntitlement(orgId, "ai_triage_requests_monthly", monthlyMsgCount || 0);
    if (!allowed) {
      return new Response("AI_LIMIT_EXCEEDED: You have reached the monthly AI request limit for your tier. Please upgrade your plan.", { status: 403 });
    }
  }

  // 2. Agent Mode Check: Disable actions for Free tier users (ptaas_concurrent_engagements is 0)
  const { getOrgLimits } = await import("@/lib/billing/entitlements");
  const limits = orgId ? await getOrgLimits(orgId) : null;
  const isAgentAllowed = limits ? limits.ptaas_concurrent_engagements > 0 : false;
  const agentModeEnabled = (profile?.vault_agent_mode_enabled ?? true) && isAgentAllowed;

  if (!message || typeof message !== "string") {
    return new Response("Missing message", { status: 400 });
  }

  if (!conversationId) {
    const { data: conv } = await supabase
      .from("vault_conversations")
      .insert({ user_id: user.id, title: message.slice(0, 80) })
      .select("id").single();
    conversationId = conv?.id;
  }

  await supabase.from("vault_messages").insert({
    conversation_id: conversationId, role: "user", content: message, context,
  });

  const { data: priorMessages } = await supabase
    .from("vault_messages").select("role, content")
    .eq("conversation_id", conversationId).order("created_at", { ascending: true })
    .limit(21);

  const history = (priorMessages ?? []).slice(0, -1).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let contextData = await gatherContextData(context);

  if (role === "admin") {
    const metric = detectDataQueryMetric(message);
    if (metric) {
      const metricData = await fetchDataForQuery(metric);
      contextData += `\n\nData for the user's question (metric: ${metric}): ${metricData}`;
    }
  }

  const responseStyle = (profile?.vault_response_style as "concise" | "detailed") ?? "concise";
  const system = buildSystemPrompt(role, realRole, contextData, agentModeEnabled, responseStyle);

  const encoder = new TextEncoder();
  let assembled = "";

  const stream = new ReadableStream({
    async start(controller) {
      let fenceStarted = false;
      try {
        for await (const chunk of streamClaude({ system, user: message, history, maxTokens: 800, temperature: 0.4 })) {
          assembled += chunk;
          // Stop forwarding to the client the moment the action fence
          // begins — without this, the raw ```vault-action JSON block
          // would flash visibly in the chat before end-of-stream
          // stripping ever runs. A few characters right at the fence
          // boundary might render for one chunk in the rare case the
          // fence marker splits across two chunks; that's a much
          // smaller cosmetic risk than showing the whole JSON block,
          // and is an accepted tradeoff rather than an oversight.
          if (!fenceStarted && assembled.includes("```vault-action")) {
            fenceStarted = true;
            const idx = assembled.indexOf("```vault-action");
            const safeToShow = assembled.slice(0, idx);
            const alreadyShown = assembled.length - chunk.length;
            if (safeToShow.length > alreadyShown) {
              controller.enqueue(encoder.encode(safeToShow.slice(alreadyShown)));
            }
            continue;
          }
          if (!fenceStarted) {
            controller.enqueue(encoder.encode(chunk));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[VAULT is temporarily unavailable: ${msg}]`));
      } finally {
        if (assembled) {
          // Strip any action block from what gets stored/shown as the
          // assistant's text — it's rendered as a separate Action
          // Preview card client-side, not as raw JSON in the transcript.
          const actionMatch = assembled.match(/```vault-action\s*([\s\S]*?)```/);
          const textOnly = assembled.replace(/```vault-action\s*[\s\S]*?```/, "").trim();

          await supabase.from("vault_messages").insert({ conversation_id: conversationId, role: "assistant", content: textOnly || assembled });
          await supabase.from("vault_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

          if (actionMatch && agentModeEnabled) {
            try {
              const parsed = JSON.parse(actionMatch[1]);
              const validated = validateProposedAction(realRole, parsed.type, parsed.params ?? {});
              if (validated) {
                const { data: actionRow } = await supabase
                  .from("vault_actions")
                  .insert({
                    conversation_id: conversationId, user_id: user.id,
                    action_type: validated.type, params: validated.params, summary: validated.summary,
                    status: "proposed",
                  })
                  .select("id").single();

                if (actionRow) {
                  controller.enqueue(encoder.encode(`\n\n__VAULT_ACTION__${JSON.stringify({
                    id: actionRow.id, type: validated.type, params: validated.params, summary: validated.summary,
                  })}`));
                }
              }
              // If validation failed (bad role, missing param, unknown
              // type), we silently drop it per the design doc §6.2 —
              // the user already saw the text-only response above,
              // nothing malformed reaches them.
            } catch {
              // Malformed JSON in the action block — same silent drop.
            }
          }

          // Log Quota Usage after successful completion
          if (orgId) {
            const { logUsage } = await import("@/lib/billing/entitlements");
            await logUsage(orgId, "ai_triage_requests_monthly", 1).catch(console.error);
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Conversation-Id": conversationId ?? "" },
  });
}
