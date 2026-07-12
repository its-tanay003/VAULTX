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

  if (isOrg) {
    const { count: repoCount } = await supabase
      .from("code_repos")
      .select("id", { count: "exact", head: true })
      .eq("org_id", profile.org_id);

    const { checkEntitlement } = await import("@/lib/billing/entitlements");
    const { allowed } = await checkEntitlement(profile.org_id, "private_repos_scanned", repoCount || 0);
    if (!allowed) {
      throw new Error("REPOS_LIMIT_EXCEEDED: You have connected the maximum number of repositories allowed for your tier. Please upgrade your plan.");
    }
  }

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check rate limit (e.g., max 10 scans per user per hour, fails-closed)
  const { checkApiRateLimit } = await import("@/lib/api/rate-limit");
  const rateLimitKey = `scan:${user.id}`;
  const rateCheck = await checkApiRateLimit(rateLimitKey, 10, true);
  if (!rateCheck.ok) {
    throw new Error("Rate limit exceeded. Maximum 10 scans per hour.");
  }

  const { data: repo } = await supabase
    .from("code_repos").select("*").eq("id", repoId).single();
  if (!repo) throw new Error("Repo not found");

  // Entitlement Check: Gate monthly scans
  if (repo.org_id) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: orgRepos } = await supabase
      .from("code_repos")
      .select("id")
      .eq("org_id", repo.org_id);
    
    const repoIds = orgRepos?.map(r => r.id) || [];
    let monthlyScanCount = 0;
    if (repoIds.length > 0) {
      const { count } = await supabase
        .from("code_scans")
        .select("id", { count: "exact", head: true })
        .in("repo_id", repoIds)
        .eq("status", "complete")
        .gte("completed_at", startOfMonth);
      monthlyScanCount = count || 0;
    }

    const { checkEntitlement } = await import("@/lib/billing/entitlements");
    const { allowed } = await checkEntitlement(repo.org_id, "ai_triage_requests_monthly", monthlyScanCount);
    if (!allowed) {
      throw new Error("AI_LIMIT_EXCEEDED: You have reached the monthly AI scan limit for your tier. Please upgrade your plan.");
    }
  }

  // Cooldown check: can't rescan the same repo within 5 minutes
  if (repo.last_scanned_at) {
    const elapsed = Date.now() - new Date(repo.last_scanned_at).getTime();
    if (elapsed < 5 * 60 * 1000) {
      throw new Error("Cooldown active. Please wait at least 5 minutes between scans.");
    }
  }

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

    // Log Quota Usage after scan successfully finishes
    if (repo.org_id) {
      const { logUsage } = await import("@/lib/billing/entitlements");
      await logUsage(repo.org_id, "ai_scan", 1);
    }
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check rate limit (e.g., max 10 scans per user per hour, fails-closed)
  const { checkApiRateLimit } = await import("@/lib/api/rate-limit");
  const rateLimitKey = `scan:${user.id}`;
  const rateCheck = await checkApiRateLimit(rateLimitKey, 10, true);
  if (!rateCheck.ok) {
    throw new Error("Rate limit exceeded. Maximum 10 scans per hour.");
  }

  const { data: repo } = await supabase
    .from("code_repos").select("*").eq("id", repoId).single();
  if (!repo) throw new Error("Repo not found");

  // Entitlement Check: Gate monthly scans
  if (repo.org_id) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: orgRepos } = await supabase
      .from("code_repos")
      .select("id")
      .eq("org_id", repo.org_id);
    
    const repoIds = orgRepos?.map(r => r.id) || [];
    let monthlyScanCount = 0;
    if (repoIds.length > 0) {
      const { count } = await supabase
        .from("code_scans")
        .select("id", { count: "exact", head: true })
        .in("repo_id", repoIds)
        .eq("status", "complete")
        .gte("completed_at", startOfMonth);
      monthlyScanCount = count || 0;
    }

    const { checkEntitlement } = await import("@/lib/billing/entitlements");
    const { allowed } = await checkEntitlement(repo.org_id, "ai_triage_requests_monthly", monthlyScanCount);
    if (!allowed) {
      throw new Error("AI_LIMIT_EXCEEDED: You have reached the monthly AI scan limit for your tier. Please upgrade your plan.");
    }
  }

  // Cooldown check: can't rescan the same repo within 5 minutes
  if (repo.last_scanned_at) {
    const elapsed = Date.now() - new Date(repo.last_scanned_at).getTime();
    if (elapsed < 5 * 60 * 1000) {
      throw new Error("Cooldown active. Please wait at least 5 minutes between scans.");
    }
  }

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

    // Log Quota Usage after scan successfully finishes
    if (repo.org_id) {
      const { logUsage } = await import("@/lib/billing/entitlements");
      await logUsage(repo.org_id, "ai_scan", 1);
    }
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
