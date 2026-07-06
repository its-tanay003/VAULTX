import { createClient } from "@/lib/supabase/server";
import { streamClaude } from "@/lib/ai/claude";
import {
  buildSystemPrompt, gatherContextData, detectDataQueryMetric, fetchDataForQuery,
  type VaultContext,
} from "@/lib/ai/vault-agent";

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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role: "researcher" | "admin" = profile?.role === "researcher" ? "researcher" : "admin";

  const body = await request.json().catch(() => null);
  const message: string | undefined = body?.message;
  const context: VaultContext = body?.context ?? {};
  let conversationId: string | undefined = body?.conversationId;

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

  const system = buildSystemPrompt(role, contextData);

  const encoder = new TextEncoder();
  let assembled = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamClaude({ system, user: message, history, maxTokens: 800, temperature: 0.4 })) {
          assembled += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[VAULT is temporarily unavailable: ${msg}]`));
      } finally {
        if (assembled) {
          await supabase.from("vault_messages").insert({ conversation_id: conversationId, role: "assistant", content: assembled });
          await supabase.from("vault_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Conversation-Id": conversationId ?? "" },
  });
}
