"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSandbox, runCommand, writeFile, readFile, deleteSandbox } from "@/lib/e2b/client";
import { getInstallationToken } from "@/lib/github/app-auth";

async function getAuthedUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

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
    console.error("[Workspace Git Auth] Failed to resolve installation token:", err);
    return undefined;
  }
}

export async function provisionWorkspace(repoId: string, branch = "main"): Promise<string> {
  const { supabase, user } = await getAuthedUser();

  const { data: repo } = await supabase
    .from("code_repos")
    .select("*")
    .eq("id", repoId)
    .single();

  if (!repo) throw new Error("Repository not found");

  let subscriptionTier = "free";
  if (repo.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("subscription_tier")
      .eq("id", repo.org_id)
      .single();
    if (org) {
      subscriptionTier = org.subscription_tier || "free";
    }
  }

  // 1800s (30 mins) for Free, 7200s (120 mins) for Pro, 86400s (24 hrs) for Enterprise
  const timeoutSeconds = subscriptionTier.toLowerCase() === "enterprise"
    ? 86400
    : subscriptionTier.toLowerCase() === "pro"
      ? 7200
      : 1800;

  // Create workspace metadata row
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      user_id: user.id,
      repo_id: repoId,
      branch,
      status: "provisioning",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  try {
    const sandbox = await createSandbox(timeoutSeconds);
    const sandboxId = sandbox.sandboxId;

    // Apply network egress firewall rules inside the E2B VM
    if (!sandboxId.startsWith("mock-sandbox-")) {
      await runCommand(sandboxId, "sudo iptables -P OUTPUT DROP");
      await runCommand(sandboxId, "sudo iptables -A OUTPUT -o lo -j ACCEPT");
      await runCommand(sandboxId, "sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT");
      await runCommand(sandboxId, "sudo iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT");
      await runCommand(sandboxId, "sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT");
    }

    // Clone the repository inside the sandbox environment
    const token = await resolveInstallationToken(repo.org_id);
    const cloneUrl = token
      ? `https://x-access-token:${token}@github.com/${repo.owner_name}/${repo.repo_name}.git`
      : `https://github.com/${repo.owner_name}/${repo.repo_name}.git`;

    const cloneCmd = `git clone -b ${branch} ${cloneUrl} .`;
    const res = await runCommand(sandboxId, cloneCmd);

    if (res.exitCode !== 0 && !sandboxId.startsWith("mock-sandbox-")) {
      throw new Error(`Git clone failed inside sandbox: ${res.stderr}`);
    }

    // Update workspace status to active
    await supabase
      .from("workspaces")
      .update({
        status: "active",
        sandbox_id: sandboxId,
      })
      .eq("id", workspace.id);

  } catch (err) {
    // Mark failed
    await supabase
      .from("workspaces")
      .update({ status: "destroyed" })
      .eq("id", workspace.id);
    throw err;
  }

  revalidatePath("/dashboard/code-quality");
  return workspace.id;
}

export async function suspendWorkspace(workspaceId: string): Promise<void> {
  const { supabase } = await getAuthedUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws) throw new Error("Workspace not found");

  if (ws.sandbox_id) {
    try {
      await deleteSandbox(ws.sandbox_id);
    } catch (e) {
      console.error("Failed to delete sandbox on suspension:", e);
    }
  }

  await supabase
    .from("workspaces")
    .update({
      status: "suspended",
      sandbox_id: null,
    })
    .eq("id", workspaceId);

  revalidatePath("/dashboard/code-quality");
}

export async function destroyWorkspace(workspaceId: string): Promise<void> {
  const { supabase } = await getAuthedUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws) throw new Error("Workspace not found");

  if (ws.sandbox_id) {
    try {
      await deleteSandbox(ws.sandbox_id);
    } catch (e) {
      console.error("Failed to delete sandbox on destruction:", e);
    }
  }

  await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  revalidatePath("/dashboard/code-quality");
}

export async function getWorkspaceFiles(workspaceId: string): Promise<string[]> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) return [];

  if (ws.sandbox_id.startsWith("mock-sandbox-")) {
    return [
      "src/index.js",
      "src/utils.js",
      "package.json",
      "README.md",
    ];
  }

  // Find all scannable files inside E2B sandbox workspace (skip dotfiles and directories)
  const res = await runCommand(ws.sandbox_id, "find . -maxdepth 5 -type f -not -path '*/.*'");
  if (res.exitCode !== 0) {
    throw new Error(`Failed to list files: ${res.stderr}`);
  }

  return res.stdout
    .split("\n")
    .map((p) => p.trim().replace(/^\.\//, ""))
    .filter((p) => p.length > 0);
}

export async function getWorkspaceFileContent(workspaceId: string, path: string): Promise<string> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) throw new Error("Active sandbox not found");
  return readFile(ws.sandbox_id, path);
}

export async function saveWorkspaceFile(workspaceId: string, path: string, content: string): Promise<void> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) throw new Error("Active sandbox not found");
  await writeFile(ws.sandbox_id, path, content);
}

export async function commitAndPushWorkspace(workspaceId: string, commitMessage: string): Promise<void> {
  const { supabase, user } = await getAuthedUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*, code_repos(*)")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) throw new Error("Active sandbox not found");
  const repo = ws.code_repos;
  if (!repo) throw new Error("Linked repository metadata not found");

  const sandboxId = ws.sandbox_id;

  if (sandboxId.startsWith("mock-sandbox-")) {
    console.log(`[E2B MOCK] Committing files: ${commitMessage}`);
    return;
  }

  // Configure Git identity
  await runCommand(sandboxId, `git config user.name "VAULTX Security Agent"`);
  await runCommand(sandboxId, `git config user.email "agent@vaultx.security"`);

  // Stage changes
  await runCommand(sandboxId, "git add .");

  // Commit
  const commitRes = await runCommand(sandboxId, `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
  if (commitRes.exitCode !== 0) {
    // If nothing changed, we exit successfully
    if (commitRes.stdout.includes("nothing to commit") || commitRes.stderr.includes("nothing to commit")) {
      return;
    }
    throw new Error(`Git commit failed: ${commitRes.stderr || commitRes.stdout}`);
  }

  // Push back using installation token
  const token = await resolveInstallationToken(repo.org_id);
  const pushUrl = token
    ? `https://x-access-token:${token}@github.com/${repo.owner_name}/${repo.repo_name}.git`
    : `https://github.com/${repo.owner_name}/${repo.repo_name}.git`;

  const pushRes = await runCommand(sandboxId, `git push ${pushUrl} ${ws.branch}`);
  if (pushRes.exitCode !== 0) {
    throw new Error(`Git push failed: ${pushRes.stderr || pushRes.stdout}`);
  }
}

export async function runTerminalCommand(
  workspaceId: string,
  cmd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { supabase } = await getAuthedUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");

  // Security check: Block attempts to flush or edit iptables
  const lower = cmd.toLowerCase().trim();
  if (lower.startsWith("iptables") || lower.includes(" iptables") || lower.includes("sudo ") || lower.includes("/etc/iptables")) {
    return {
      stdout: "",
      stderr: "Security Policy Exception: Direct privilege escalation (sudo) or firewall configuration (iptables) is prohibited inside developer workspaces.",
      exitCode: 1,
    };
  }

  return runCommand(ws.sandbox_id, cmd);
}

export async function createWorkspaceFile(workspaceId: string, path: string): Promise<void> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");
  await runCommand(ws.sandbox_id, `touch "${path.replace(/"/g, '\\"')}"`);
}

export async function createWorkspaceFolder(workspaceId: string, path: string): Promise<void> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");
  await runCommand(ws.sandbox_id, `mkdir -p "${path.replace(/"/g, '\\"')}"`);
}

export async function deleteWorkspacePath(workspaceId: string, path: string): Promise<void> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");
  await runCommand(ws.sandbox_id, `rm -rf "${path.replace(/"/g, '\\"')}"`);
}

export async function renameWorkspacePath(workspaceId: string, oldPath: string, newPath: string): Promise<void> {
  const { supabase } = await getAuthedUser();
  const { data: ws } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");
  await runCommand(ws.sandbox_id, `mv "${oldPath.replace(/"/g, '\\"')}" "${newPath.replace(/"/g, '\\"')}"`);
}


