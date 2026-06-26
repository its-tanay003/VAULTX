"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { createHash }     from "crypto";

/* ─── Create competition ──────────────────────────────────────────────────── */
export async function createCompetition(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) {
    throw new Error("Only organizations can create CTF competitions");
  }

  const title       = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const startsAt    = formData.get("starts_at") as string;
  const endsAt      = formData.get("ends_at")   as string;
  const isPublic    = formData.get("is_public") === "true";

  if (!title || !description || !startsAt || !endsAt) {
    throw new Error("Title, description, and dates are required");
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    throw new Error("End time must be after start time");
  }

  const { data: competition, error } = await supabase
    .from("ctf_competitions")
    .insert({
      org_id:      profile.org_id,
      title,
      description,
      starts_at:   startsAt,
      ends_at:     endsAt,
      is_public:   isPublic,
      status:      "draft",
      created_by:  user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ctf");
  redirect(`/dashboard/ctf/${competition.id}`);
}

/* ─── Update competition status ───────────────────────────────────────────── */
export async function updateCompetitionStatus(
  competitionId: string,
  status: "draft" | "active" | "ended" | "archived"
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ctf_competitions")
    .update({ status })
    .eq("id", competitionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/ctf/${competitionId}`);
  revalidatePath("/dashboard/ctf");
}

/* ─── Create challenge ────────────────────────────────────────────────────── */
export async function createChallenge(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const competitionId   = formData.get("competition_id") as string;
  const title           = (formData.get("title") as string)?.trim();
  const description     = (formData.get("description") as string)?.trim();
  const category        = formData.get("category") as string;
  const difficulty      = formData.get("difficulty") as string;
  const flagPlaintext   = (formData.get("flag") as string)?.trim();
  const basePoints      = parseInt(formData.get("base_points") as string) || 500;
  const minPoints       = parseInt(formData.get("min_points") as string) || 100;
  const hint            = (formData.get("hint") as string)?.trim() || null;
  const hintCost        = parseInt(formData.get("hint_cost") as string) || 50;
  const attachmentUrl   = (formData.get("attachment_url") as string)?.trim() || null;

  if (!title || !description || !category || !difficulty || !flagPlaintext) {
    throw new Error("Title, description, category, difficulty, and flag are required");
  }
  if (!flagPlaintext.startsWith("FLAG{") || !flagPlaintext.endsWith("}")) {
    throw new Error('Flag must follow the format: FLAG{...}');
  }
  if (minPoints > basePoints) {
    throw new Error("Min points cannot exceed base points");
  }

  // Hash the flag — never store plaintext
  const flagHash = createHash("sha256").update(flagPlaintext).digest("hex");

  const { error } = await supabase
    .from("ctf_challenges")
    .insert({
      competition_id: competitionId,
      title,
      description,
      category,
      difficulty,
      flag_hash:   flagHash,
      base_points: basePoints,
      min_points:  minPoints,
      hint,
      hint_cost:   hintCost,
      attachment_url: attachmentUrl,
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/ctf/${competitionId}`);
  redirect(`/dashboard/ctf/${competitionId}`);
}

/* ─── Reveal hint (costs points — deducted from researcher's CTF score) ─── */
export async function revealHint(
  challengeId:   string,
  competitionId: string,
  hintCost:      number
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Record the reveal
  const { error } = await supabase
    .from("ctf_hint_reveals")
    .insert({ challenge_id: challengeId, researcher_id: user.id })
    .select("challenge_id")
    .single();

  if (error) {
    if (error.code === "23505") return; // already revealed, idempotent
    throw new Error(error.message);
  }

  // Deduct points by inserting a negative adjustment solve entry
  // (simplest approach that works with the existing scoreboard view)
  if (hintCost > 0) {
    await supabase.from("ctf_solves").insert({
      challenge_id:   challengeId,
      competition_id: competitionId,
      researcher_id:  user.id,
      points_awarded: -hintCost,
      solve_position: 0, // 0 = penalty, not a real solve
    }).then(({ error: e }) => {
      // Non-fatal — hint revealed even if penalty insert fails
      if (e && e.code !== "23505") console.error("[CTF Hint]", e.message);
    });
  }

  revalidatePath(`/dashboard/ctf/${competitionId}/play`);
}

/* ─── Delete challenge (org only, before competition goes live) ─────────── */
export async function deleteChallenge(
  challengeId:   string,
  competitionId: string
): Promise<void> {
  const supabase = createClient();
  const { data: competition } = await supabase
    .from("ctf_competitions").select("status").eq("id", competitionId).single();

  if (competition?.status === "active") {
    throw new Error("Cannot delete challenges from an active competition");
  }

  const { error } = await supabase
    .from("ctf_challenges").delete().eq("id", challengeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/ctf/${competitionId}`);
}
