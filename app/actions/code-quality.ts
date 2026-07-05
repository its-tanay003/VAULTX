"use server";

/**
 * UPDATED Week 12: app/actions/code-quality.ts
 *
 * Full drop-in replacement for the Week 6 version. Adds:
 *   - runWeb3Audit()  — Solidity-specific smart contract audit
 *   - connectRepo()   — now accepts an optional scan_type parameter
 *
 * The original runScan() (general code quality) is unchanged.
 */

import { createClient }    from "@/lib/supabase/server";
import { revalidatePath }  from "next/cache";
import { redirect }        from "next/navigation";
import {
  parseGithubUrl, fetchRepoMetadata, fetchRepoTree,
  selectPriorityFiles, selectPrioritySolidityFiles, fetchFiles,
} from "@/lib/github/client";
import { getInstallationToken } from "@/lib/github/app-auth";
import { runCodeQualityScan } from "@/lib/ai/code-review";
import { runSmartContractAudit } from "@/lib/ai/smart-contract-audit";

const SOL_EXTENSIONS = [".sol"];

/**
 * Resolves a GitHub App installation token for a repo's owning org, if
 * one exists. Returns undefined (not an error) when the repo has no
 * org, or the org never connected the GitHub App — callers fall back
 * to the existing unauthenticated public-repo path in that case.
 */
async function resolveInstallationToken(orgId: string | null): Promise<string | undefined> {
  if (!orgId) return undefined;
  const supabase = createClient();
  const { data } = await supabase
    .from("github_installations")
    .select("installation_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) return undefined;
  try {
    return await getInstallationToken(data.installation_id);
  } catch (err) {
    console.error("[Code Quality] Failed to mint installation token, falling back to public access:", err);
    return undefined;
  }
}

/* ─── Connect a public GitHub repo ────────────────────────────────────────── */
export async function connectRepo(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const githubUrl = (formData.get("github_url") as string)?.trim();
  if (!githubUrl) throw new Error("GitHub URL is required");

  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) throw new Error("Invalid GitHub URL — use format: https://github.com/owner/repo");

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  const isOrg = ["org", "triager", "admin"].includes(profile?.role ?? "") && profile?.org_id;

  const installationToken = await resolveInstallationToken(isOrg ? profile.org_id : null);
  const meta = await fetchRepoMetadata(parsed.owner, parsed.repo, installationToken);

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

/* ─── Run a general code quality scan (unchanged from Week 6) ─────────────── */
export async function runScan(repoId: string): Promise<void> {
  const supabase = createClient();

  const { data: repo } = await supabase
    .from("code_repos").select("*").eq("id", repoId).single();
  if (!repo) throw new Error("Repo not found");

  const { data: scan } = await supabase
    .from("code_scans")
    .insert({ repo_id: repoId, status: "running", scan_type: "general" })
    .select("id")
    .single();
  if (!scan) throw new Error("Failed to create scan record");

  try {
    const installationToken = await resolveInstallationToken(repo.org_id);
    const tree     = await fetchRepoTree(repo.owner_name, repo.repo_name, repo.default_branch, undefined, installationToken);
    const priority = selectPriorityFiles(tree, 8);
    const files    = await fetchFiles(repo.owner_name, repo.repo_name, repo.default_branch, priority, installationToken);

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

/* ─── Run a Web3 smart contract audit (NEW Week 12) ──────────────────────── */
export async function runWeb3Audit(repoId: string): Promise<void> {
  const supabase = createClient();

  const { data: repo } = await supabase
    .from("code_repos").select("*").eq("id", repoId).single();
  if (!repo) throw new Error("Repo not found");

  // Create scan record immediately so the UI can show "Running…"
  const { data: scan } = await supabase
    .from("code_scans")
    .insert({ repo_id: repoId, status: "running", scan_type: "web3_smart_contract" })
    .select("id")
    .single();
  if (!scan) throw new Error("Failed to create scan record");

  try {
    // Fetch ONLY .sol files using the extended fetchRepoTree()
    const installationToken = await resolveInstallationToken(repo.org_id);
    const tree     = await fetchRepoTree(repo.owner_name, repo.repo_name, repo.default_branch, SOL_EXTENSIONS, installationToken);
    const priority = selectPrioritySolidityFiles(tree, 10);
    const files    = await fetchFiles(repo.owner_name, repo.repo_name, repo.default_branch, priority, installationToken);

    if (files.length === 0) {
      await supabase
        .from("code_scans")
        .update({
          status:       "failed",
          error:        "No .sol files found in this repository. Make sure this is a Solidity project.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", scan.id);
      revalidatePath(`/dashboard/code-quality/${repoId}`);
      return;
    }

    const result = await runSmartContractAudit(`${repo.owner_name}/${repo.repo_name}`, files);

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
    const msg = err instanceof Error ? err.message : "Web3 audit failed";
    await supabase
      .from("code_scans")
      .update({ status: "failed", error: msg, completed_at: new Date().toISOString() })
      .eq("id", scan.id);
    throw err;
  }

  revalidatePath(`/dashboard/code-quality/${repoId}`);
  revalidatePath("/dashboard/code-quality");
}
