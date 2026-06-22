"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/utils";
import type { ProgramStatus, ProgramType } from "@/lib/supabase/types";

/* ─── Shared validation ───────────────────────────────────────────────────── */
function parseScope(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getOrgId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !["org", "triager", "admin"].includes(profile.role)) {
    throw new Error("Not authorized to manage programs");
  }

  return profile.org_id;
}

/* ─── Create program ──────────────────────────────────────────────────────── */
export async function createProgram(formData: FormData) {
  const supabase = createClient();
  const orgId    = await getOrgId(supabase);

  const name       = formData.get("name")       as string;
  const type       = formData.get("type")       as ProgramType;
  const description= formData.get("description")as string;
  const rules      = formData.get("rules")      as string;
  const scopeIn    = parseScope(formData.get("scope_in")  as string);
  const scopeOut   = parseScope(formData.get("scope_out") as string);
  const minReward  = formData.get("min_reward") ? Number(formData.get("min_reward")) : null;
  const maxReward  = formData.get("max_reward") ? Number(formData.get("max_reward")) : null;
  const isPublic   = formData.get("is_public") === "true";
  const status     = (formData.get("status") as ProgramStatus) ?? "draft";

  if (!name?.trim())        throw new Error("Program name is required");
  if (!description?.trim()) throw new Error("Description is required");

  // Unique slug per org
  const baseSlug = slugify(name);
  let   slug     = baseSlug;
  let   attempt  = 0;

  while (true) {
    const { data: existing } = await supabase
      .from("programs")
      .select("id")
      .eq("org_id", orgId)
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { data: program, error } = await supabase
    .from("programs")
    .insert({
      org_id:      orgId,
      name:        name.trim(),
      slug,
      type,
      status,
      description: description.trim(),
      rules:       rules?.trim() ?? "",
      scope_in:    scopeIn,
      scope_out:   scopeOut,
      min_reward:  minReward,
      max_reward:  maxReward,
      is_public:   isPublic,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/org/programs");
  redirect(`/dashboard/org/programs/${program.id}`);
}

/* ─── Update program ──────────────────────────────────────────────────────── */
export async function updateProgram(programId: string, formData: FormData) {
  const supabase = createClient();
  const orgId    = await getOrgId(supabase);

  // Verify ownership
  const { data: existing } = await supabase
    .from("programs")
    .select("id, org_id")
    .eq("id", programId)
    .eq("org_id", orgId)
    .single();

  if (!existing) throw new Error("Program not found or access denied");

  const name        = formData.get("name")        as string;
  const description = formData.get("description") as string;
  const rules       = formData.get("rules")       as string;
  const scopeIn     = parseScope(formData.get("scope_in")  as string);
  const scopeOut    = parseScope(formData.get("scope_out") as string);
  const minReward   = formData.get("min_reward")  ? Number(formData.get("min_reward"))  : null;
  const maxReward   = formData.get("max_reward")  ? Number(formData.get("max_reward"))  : null;
  const isPublic    = formData.get("is_public") === "true";
  const status      = formData.get("status") as ProgramStatus;

  const { error } = await supabase
    .from("programs")
    .update({
      name:        name?.trim(),
      description: description?.trim(),
      rules:       rules?.trim(),
      scope_in:    scopeIn,
      scope_out:   scopeOut,
      min_reward:  minReward,
      max_reward:  maxReward,
      is_public:   isPublic,
      status,
    })
    .eq("id", programId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/org/programs/${programId}`);
  revalidatePath("/dashboard/org/programs");
}

/* ─── Update status only ──────────────────────────────────────────────────── */
export async function updateProgramStatus(programId: string, status: ProgramStatus) {
  const supabase = createClient();
  const orgId    = await getOrgId(supabase);

  const { error } = await supabase
    .from("programs")
    .update({ status })
    .eq("id", programId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/org/programs/${programId}`);
  revalidatePath("/dashboard/org/programs");
}

/* ─── Delete / archive program ────────────────────────────────────────────── */
export async function archiveProgram(programId: string) {
  return updateProgramStatus(programId, "archived");
}
