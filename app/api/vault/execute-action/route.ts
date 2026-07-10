import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateProposedAction, executeAction } from "@/lib/ai/vault-actions";
import type { UserRole } from "@/lib/supabase/types";

/**
 * POST /api/vault/execute-action
 *
 * Body: { actionId: string }
 *
 * Only ever executes an action that was already proposed and stored
 * by /api/vault/chat (status='proposed'), belonging to the requesting
 * user. Re-validates role + params against the registry again here —
 * never trusts that "it was valid when proposed" still holds (a
 * user's role could have changed between proposal and confirmation).
 * Writes to the platform's existing audit_logs table on execution,
 * with the confirming human as actor_id, per the design doc §4.2 —
 * an AI-triggered action is exactly as attributable as a manual one.
 */
export async function POST(request: Request) {
  const { validateCsrf } = await import("@/lib/api/csrf");
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const actionId: string | undefined = body?.actionId;
  if (!actionId) return NextResponse.json({ error: "Missing actionId" }, { status: 400 });

  const { data: action } = await supabase
    .from("vault_actions").select("*").eq("id", actionId).eq("user_id", user.id).single();

  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  if (action.status !== "proposed") {
    return NextResponse.json({ error: `This action is already ${action.status}` }, { status: 409 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, vault_agent_mode_enabled, vault_agent_consent_at").eq("id", user.id).single();
  const role: UserRole = profile?.role ?? "researcher";

  if (profile?.vault_agent_mode_enabled === false) {
    await supabase.from("vault_actions").update({ status: "cancelled", error: "Agent Mode is disabled for this account" }).eq("id", actionId);
    return NextResponse.json({ error: "Agent Mode is disabled for your account — enable it in Settings to execute actions" }, { status: 403 });
  }

  const revalidated = validateProposedAction(role, action.action_type, action.params as Record<string, unknown>);
  if (!revalidated) {
    await supabase.from("vault_actions").update({ status: "cancelled", error: "Re-validation failed at confirmation time" }).eq("id", actionId);
    return NextResponse.json({ error: "This action is no longer permitted for your role" }, { status: 403 });
  }

  await supabase.from("vault_actions").update({ status: "confirmed" }).eq("id", actionId);

  // Record consent the first time this user ever confirms an Agent Mode
  // action — durable, one-time, not a recurring dialog (design doc §9).
  if (!profile?.vault_agent_consent_at) {
    await supabase.from("profiles").update({ vault_agent_consent_at: new Date().toISOString() }).eq("id", user.id);
  }

  const result = await executeAction(revalidated.type, revalidated.params);

  await supabase
    .from("vault_actions")
    .update({
      status: result.success ? "executed" : "failed",
      result: result.result ?? null,
      error: result.error ?? null,
      executed_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  if (result.success) {
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: `vault_agent.${revalidated.type}`,
      entity: "vault_actions",
      entity_id: actionId,
      after: { ...revalidated.params, via: "vault_agent", result: result.result },
    });
  }

  return NextResponse.json(result);
}
