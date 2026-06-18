"use server";

/**
 * UPDATED: app/actions/submissions.ts
 *
 * Add this block at the END of createSubmission(), just before the redirect:
 *
 *   // Fire-and-forget AI validation (non-blocking)
 *   triggerAIValidation(submission.id).catch(console.error);
 *
 * And add this function to the file:
 */

/**
 * Triggers AI validation asynchronously after submission insert.
 * Fire-and-forget — does not block the researcher's redirect.
 */
export async function triggerAIValidation(submissionId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    // Call our own API route — this runs in the background
    const res = await fetch(`${baseUrl}/api/ai/validate-submission`, {
      method:  "POST",
      headers: {
        "Content-Type":   "application/json",
        "x-vault-secret": process.env.VAULT_INTERNAL_SECRET ?? "",
      },
      body: JSON.stringify({ submission_id: submissionId }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[AI Validate] HTTP ${res.status}: ${err}`);
    }
  } catch (err) {
    // Non-fatal — validation can be retried manually
    console.error("[AI Validate] Failed to trigger validation:", err);
  }
}

/**
 * Manual re-trigger for triagers (when AI analysis is missing or stale).
 * Only callable by triager/org/admin roles.
 */
export async function retriggerAIValidation(submissionId: string): Promise<void> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["org", "triager", "admin"].includes(profile?.role ?? "")) {
    throw new Error("Only triagers can re-trigger AI validation");
  }

  await triggerAIValidation(submissionId);
}
