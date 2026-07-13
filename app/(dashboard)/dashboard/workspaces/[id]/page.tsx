import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Terminal, Cpu, Play } from "lucide-react";
import { WorkspaceEditor } from "@/components/workspace/editor";
import { ResumeWorkspaceButton } from "@/components/workspace/resume-button";
import type { Metadata } from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("code_repos(repo_name)")
    .eq("id", params.id)
    .single();

  const repo = (data as any)?.code_repos;
  return { title: repo ? `${repo.repo_name} Workspace` : "Developer Workspace" };
}

export default async function WorkspaceDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*, code_repos(id, owner_name, repo_name)")
    .eq("id", params.id)
    .single();

  if (!ws || ws.status === "destroyed") notFound();
  const repo = (ws as any).code_repos;

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/code-quality/${repo.id}`}
          className="text-vault-muted hover:text-vault-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-vault-teal" />
            Workspace IDE
          </h1>
        </div>
      </div>

      {ws.status === "active" && ws.sandbox_id ? (
        <WorkspaceEditor workspaceId={ws.id} repoName={`${repo.owner_name}/${repo.repo_name}`} />
      ) : (
        <div className="vault-card p-8 text-center max-w-md mx-auto space-y-4">
          <Cpu className="w-10 h-10 text-vault-muted mx-auto opacity-75" />
          <div>
            <h2 className="text-sm font-semibold">Workspace is Suspended</h2>
            <p className="text-xs text-vault-muted mt-1">
              The sandboxed container VM for this workspace has been paused or stopped to conserve resources. Click below to re-provision the environment.
            </p>
          </div>
          <ResumeWorkspaceButton workspaceId={ws.id} repoId={repo.id} branch={ws.branch} />
        </div>
      )}
    </div>
  );
}
