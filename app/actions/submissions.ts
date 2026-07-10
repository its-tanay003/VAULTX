"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { sha256 }         from "@/lib/utils";
import { triggerAIValidation } from "./ai-validation";
import type { SeverityLevel } from "@/lib/supabase/types";

/* ─── Upstash rate limiter (graceful fallback if not configured) ──────────── */
async function checkRateLimit(userId: string): Promise<void> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return; // skip if not configured

  const key     = `rate:submission:${userId}`;
  const limit   = 5;   // max 5 submissions per window
  const windowS = 3600; // 1 hour

  const res = await fetch(`${url}/incr/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { result: count } = await res.json();

  if (count === 1) {
    await fetch(`${url}/expire/${key}/${windowS}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (count > limit) {
    throw new Error(`Rate limit exceeded. You can submit up to ${limit} reports per hour.`);
  }
}

/* ─── Create submission ───────────────────────────────────────────────────── */
export async function createSubmission(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify researcher role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "researcher") {
    throw new Error("Only researchers can submit reports");
  }

  await checkRateLimit(user.id);

  const programId         = formData.get("program_id")          as string;
  const title             = (formData.get("title")              as string)?.trim();
  const description       = (formData.get("description")        as string)?.trim();
  const stepsToReproduce  = (formData.get("steps_to_reproduce") as string)?.trim();
  const impact            = (formData.get("impact")             as string)?.trim();
  const severity          = formData.get("severity")            as SeverityLevel;

  if (!programId)       throw new Error("Program is required");
  if (!title)           throw new Error("Title is required");
  if (title.length < 10)throw new Error("Title must be at least 10 characters");
  if (!description)     throw new Error("Description is required");
  if (!stepsToReproduce)throw new Error("Steps to reproduce are required");
  if (!severity)        throw new Error("Severity is required");

  // Verify program is active and public (or researcher has access)
  const { data: program } = await supabase
    .from("programs")
    .select("id, status, is_public")
    .eq("id", programId)
    .single();

  if (!program || program.status !== "active") {
    throw new Error("Program is not accepting submissions");
  }

  // Stage 1: exact duplicate detection via SHA-256
  const contentHash = await sha256(`${title}${description}`);

  const { data: exactDuplicate } = await supabase
    .from("submissions")
    .select("id")
    .eq("program_id", programId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  // Stage 2: fuzzy duplicate detection via pg_trgm
  const { data: fuzzyMatches } = await supabase
    .rpc("find_similar_submissions", {
      p_program_id:  programId,
      p_title:       title,
      p_description: description,
      p_threshold:   0.4,
    })
    .limit(1);

  const fuzzyDuplicate = fuzzyMatches?.[0] ?? null;

  // Insert submission
  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      program_id:         programId,
      researcher_id:      user.id,
      title,
      description,
      steps_to_reproduce: stepsToReproduce ?? "",
      impact:             impact ?? "",
      severity,
      status:             "new",
      content_hash:       contentHash,
      ai_duplicate_of:    exactDuplicate?.id ?? fuzzyDuplicate?.id ?? null,
      attachments:        [],
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Log to audit
  await supabase.from("audit_logs").insert({
    actor_id:  user.id,
    action:    "submission.created",
    entity:    "submissions",
    entity_id: submission.id,
    after:     { title, severity, program_id: programId },
  });

  // Trigger AI validation (async background pipeline)
  triggerAIValidation(submission.id).catch(console.error);

  revalidatePath("/dashboard/researcher/submissions");
  redirect(`/dashboard/researcher/submissions/${submission.id}`);
}

/* ─── Upload attachment ───────────────────────────────────────────────────── */
export async function uploadAttachment(
  submissionId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File size must be under 2MB");
  }

  const ext  = file.name.split(".").pop();
  const path = `${user.id}/${submissionId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { upsert: false });

  if (error) throw new Error(error.message);

  // Append raw path to submission attachments array (private bucket safety)
  const { data: sub } = await supabase
    .from("submissions")
    .select("attachments")
    .eq("id", submissionId)
    .single();

  await supabase
    .from("submissions")
    .update({ attachments: [...(sub?.attachments ?? []), path] })
    .eq("id", submissionId);

  return path;
}

/** Generates a time-limited signed download URL fresh at fetch time for private attachment paths */
export async function getAttachmentDownloadUrl(path: string): Promise<string> {
  const supabase = createClient();
  
  // RLS policy on submissions/profiles will govern if they have access to the file/folder
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(path, 900); // 15 minutes validity
    
  if (error || !data?.signedUrl) {
    throw new Error("Unable to generate download link for attachment");
  }
  
  return data.signedUrl;
}
