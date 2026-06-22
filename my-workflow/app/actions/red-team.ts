"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { runRedTeamScan, getOrCreateFindingsProgram } from "@/lib/ai/red-team";
import { parseGithubUrl } from "@/lib/github/client";

/* ─── Create target ────────────────────────────────────────────────────────── */
export async function createTarget(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) {
    throw new Error("Only organizations can create AI Red Team targets");
  }

  const name             = (formData.get("name") as string)?.trim();
  const targetType       = formData.get("target_type") as "github_repo" | "scope_description";
  const targetValue      = (formData.get("target_value") as string)?.trim();
  const aggressionLevel  = formData.get("aggression_level") as "passive" | "standard" | "aggressive";

  if (!name || !targetType || !targetValue) {
    throw new Error("Name, target type, and target value are required");
  }
  if (targetType === "github_repo" && !parseGithubUrl(targetValue)) {
    throw new Error("Invalid GitHub URL — use format: https://github.com/owner/repo");
  }

  // Ensure the internal findings program exists before the first scan ever runs
  await getOrCreateFindingsProgram(profile.org_id);

  const { data: target, error } = await supabase
    .from("red_team_targets")
    .insert({
      org_id: profile.org_id,
      name,
      target_type: targetType,
      target_value: targetValue,
      aggression_level: aggressionLevel || "standard",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ai-red-team");

  // Kick off the first scan immediately, fire-and-forget
  runRedTeamScan(target.id).catch(console.error);

  redirect(`/dashboard/ai-red-team/${target.id}`);
}

/* ─── Manually trigger a scan ─────────────────────────────────────────────── */
export async function triggerScan(targetId: string): Promise<void> {
  // EXPLICIT ownership check required here — runRedTeamScan() uses the
  // admin client internally (see lib/ai/red-team.ts header comment) and
  // bypasses RLS entirely. This action is the authorization boundary.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: target } = await supabase
    .from("red_team_targets")
    .select("org_id, organizations(owner_id)")
    .eq("id", targetId)
    .single();

  const org = Array.isArray(target?.organizations) ? target.organizations[0] : target?.organizations;
  if (!target || org?.owner_id !== user.id) {
    throw new Error("Access denied — you don't own this target");
  }

  await runRedTeamScan(targetId);
  revalidatePath(`/dashboard/ai-red-team/${targetId}`);
  revalidatePath("/dashboard/ai-red-team");
}

/* ─── Toggle target active/inactive (pauses scheduled scans) ─────────────── */
export async function toggleTargetActive(targetId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("red_team_targets")
    .update({ is_active: isActive })
    .eq("id", targetId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/ai-red-team/${targetId}`);
  revalidatePath("/dashboard/ai-red-team");
}

/* ─── Delete a target ──────────────────────────────────────────────────────── */
export async function deleteTarget(targetId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("red_team_targets").delete().eq("id", targetId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/ai-red-team");
  redirect("/dashboard/ai-red-team");
}
