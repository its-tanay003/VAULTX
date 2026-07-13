"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchRepoTree, fetchFileContent, parseGithubUrl } from "@/lib/github/client";
import { getInstallationToken } from "@/lib/github/app-auth";

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
    console.error("[Code Review] Failed to mint installation token:", err);
    return undefined;
  }
}

export async function getRepoTree(repoId: string): Promise<string[]> {
  const supabase = createClient();
  const { data: repo } = await supabase
    .from("code_repos")
    .select("*")
    .eq("id", repoId)
    .single();

  if (!repo) throw new Error("Repo not found");

  const token = await resolveInstallationToken(repo.org_id);
  // Fetch the full repo tree (passing undefined for extensions so it gets all scannable files or we can pass a broader list of extensions to display in the tree)
  // Let's pass all files by specifying a wide extensions list, or allow all files by overriding it.
  const ALL_EXTENSIONS = [
    ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rb", ".java",
    ".php", ".rs", ".c", ".cpp", ".cs", ".sql", ".sol", ".json", ".md", ".html", ".css"
  ];
  return fetchRepoTree(repo.owner_name, repo.repo_name, repo.default_branch, ALL_EXTENSIONS, token);
}

export async function getFileContentAction(repoId: string, path: string): Promise<string> {
  const supabase = createClient();
  const { data: repo } = await supabase
    .from("code_repos")
    .select("*")
    .eq("id", repoId)
    .single();

  if (!repo) throw new Error("Repo not found");

  const token = await resolveInstallationToken(repo.org_id);
  return fetchFileContent(repo.owner_name, repo.repo_name, repo.default_branch, path, token);
}
