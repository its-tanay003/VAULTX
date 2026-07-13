"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ReviewSession {
  id: string;
  repo_id: string;
  scan_id: string | null;
  last_viewed_file: string | null;
  cursor_line: number;
}

export async function getReviewSession(repoId: string): Promise<ReviewSession | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("review_sessions")
    .select("id, repo_id, scan_id, last_viewed_file, cursor_line")
    .eq("user_id", user.id)
    .eq("repo_id", repoId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch review session:", error);
    return null;
  }

  return data;
}

export async function saveReviewSession(
  repoId: string,
  scanId: string | null,
  lastViewedFile: string | null,
  cursorLine: number
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("review_sessions")
    .upsert(
      {
        user_id: user.id,
        repo_id: repoId,
        scan_id: scanId || null,
        last_viewed_file: lastViewedFile,
        cursor_line: cursorLine,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,repo_id" }
    );

  if (error) {
    console.error("Failed to save review session:", error);
    throw new Error(error.message || "Failed to save review session");
  }
}
