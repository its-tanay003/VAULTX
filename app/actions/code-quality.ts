"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import {
  parseGithubUrl, fetchRepoMetadata, fetchRepoTree,
  selectPriorityFiles, fetchFiles,
} from "@/lib/github/client";
import { runCodeQualityScan } from "@/lib/ai/code-review";

/* ─── Connect a public GitHub repo ────────────────────────────────────────── */
export async function connectRepo(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const githubUrl = (formData.get("github_url") as string)?.trim();
  if (!githubUrl) throw new Error("GitHub URL is required");

  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) throw new Error("Invalid GitHub URL — use format: https://github.com/owner/repo");

  // Verify repo exists and is public
  const meta = await fetchRepoMetadata(parsed.owner, parsed.repo);

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();

  const isOrg = ["org", "triager", "admin"].includes(profile?.role ?? "") && profile?.org_id;

  const { data: repo, error } = await supabase
    .from("code_repos")
    .insert({
      org_id:         isOrg ? profile.org_id : null,
      profile_id:     isOrg ? null : user.id,
      github_url:     githubUrl,
      owner_name:     parsed.owner,
      repo_name:      parsed.repo,
      default_branch: meta.defaultBranch,
      connected_by:   user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("This repository is already connected");
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/code-quality");

  // Kick off first scan immediately (fire and forget)
  runScan(repo.id).catch(console.error);

  redirect(`/dashboard/code-quality/${repo.id}`);
}

/* ─── Remove a connected repo ─────────────────────────────────────────────── */
export async function disconnectRepo(repoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("code_repos").delete().eq("id", repoId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/code-quality");
}

/* ─── Run (or re-run) a scan ──────────────────────────────────────────────── */
export async function runScan(repoId: string): Promise<void> {
  const supabase = createClient();

  const { data: repo } = await supabase
    .from("code_repos").select("*").eq("id", repoId).single();
  if (!repo) throw new Error("Repo not found");

  // Create a pending scan record immediately so the UI can show progress
  const { data: scan, error: scanErr } = await supabase
    .from("code_scans")
    .insert({ repo_id: repoId, status: "running" })
    .select("id")
    .single();
  if (scanErr) throw new Error(scanErr.message);

  try {
    const tree     = await fetchRepoTree(repo.owner_name, repo.repo_name, repo.default_branch);
    const priority = selectPriorityFiles(tree, 8);
    const files    = await fetchFiles(repo.owner_name, repo.repo_name, repo.default_branch, priority);

    const result = await runCodeQualityScan(`${repo.owner_name}/${repo.repo_name}`, files);

    await supabase
      .from("code_scans")
      .update({
        status:        "complete",
        score:         result.score,
        summary:       result.summary,
        findings:      result.findings,
        files_scanned: files.length,
        completed_at:  new Date().toISOString(),
      })
      .eq("id", scan.id);

    await supabase
      .from("code_repos")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("id", repoId);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Scan failed";
    await supabase
      .from("code_scans")
      .update({ status: "failed", error: msg, completed_at: new Date().toISOString() })
      .eq("id", scan.id);
    throw err;
  }

  revalidatePath(`/dashboard/code-quality/${repoId}`);
  revalidatePath("/dashboard/code-quality");
}
