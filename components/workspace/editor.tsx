"use client";

import { useEffect, useState, useTransition } from "react";
import MonacoEditor from "@monaco-editor/react";
import { Folder, File, ChevronRight, ChevronDown, Save, GitCommit, Pause, Trash2, Loader2 } from "lucide-react";
import { getWorkspaceFiles, getWorkspaceFileContent, saveWorkspaceFile, commitAndPushWorkspace, suspendWorkspace, destroyWorkspace } from "@/app/actions/workspace";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WorkspaceTerminal } from "./terminal";


interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

interface WorkspaceEditorProps {
  workspaceId: string;
  repoName: string;
}

export function WorkspaceEditor({ workspaceId, repoName }: WorkspaceEditorProps) {
  const router = useRouter();
  const [files, setFiles] = useState<string[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [commitMessage, setCommitMessage] = useState("Update workspace files");
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  const [isSaving, startSave] = useTransition();
  const [isCommitting, startCommit] = useTransition();
  const [isSuspending, startSuspend] = useTransition();
  const [isDestroying, startDestroy] = useTransition();

  // Helper: build nested tree
  function buildTree(paths: string[]): TreeNode[] {
    const root: TreeNode[] = [];
    paths.forEach((path) => {
      const parts = path.split("/");
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join("/");
        let existingNode = currentLevel.find((node) => node.name === part);

        if (!existingNode) {
          existingNode = {
            name: part,
            path: currentPath,
            isDir: !isLast,
            children: isLast ? undefined : [],
          };
          currentLevel.push(existingNode);
        }
        if (!isLast && existingNode.children) {
          currentLevel = existingNode.children;
        }
      });
    });

    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.children) sortTree(node.children);
      });
    };
    sortTree(root);
    return root;
  }

  // Load files list on mount
  useEffect(() => {
    async function load() {
      try {
        const paths = await getWorkspaceFiles(workspaceId);
        setFiles(paths);
        setTree(buildTree(paths));
        if (paths.length > 0) {
          handleSelectFile(paths[0]);
        }
      } catch (err) {
        toast.error("Failed to load workspace files");
      } finally {
        setLoadingFiles(false);
      }
    }
    load();
  }, [workspaceId]);

  // Load active file content
  async function handleSelectFile(path: string) {
    if (isDirty) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }

    setActiveFile(path);
    setLoadingContent(true);
    setIsDirty(false);
    try {
      const text = await getWorkspaceFileContent(workspaceId, path);
      setFileContent(text);
    } catch (err) {
      toast.error("Failed to load file content");
      setFileContent("");
    } finally {
      setLoadingContent(false);
    }
  }

  // Save changes locally in E2B sandbox
  function handleSave() {
    if (!activeFile) return;
    startSave(async () => {
      try {
        await saveWorkspaceFile(workspaceId, activeFile, fileContent);
        setIsDirty(false);
        toast.success("File saved locally");
      } catch (err) {
        toast.error("Failed to save file");
      }
    });
  }

  // Commit and Push to remote branch
  function handleCommitAndPush() {
    startCommit(async () => {
      try {
        await commitAndPushWorkspace(workspaceId, commitMessage);
        setShowCommitDialog(false);
        toast.success("Changes successfully pushed to GitHub");
      } catch (err: any) {
        toast.error(err.message || "Failed to commit and push changes");
      }
    });
  }

  // Suspend Sandbox VM
  function handleSuspend() {
    if (confirm("Are you sure you want to suspend this workspace? VM session will be stopped.")) {
      startSuspend(async () => {
        try {
          await suspendWorkspace(workspaceId);
          toast.success("Workspace suspended");
          router.push("/dashboard/code-quality");
        } catch (err) {
          toast.error("Failed to suspend workspace");
        }
      });
    }
  }

  // Destroy Workspace
  function handleDestroy() {
    if (confirm("Permanently destroy this workspace? All unsaved VM files will be lost.")) {
      startDestroy(async () => {
        try {
          await destroyWorkspace(workspaceId);
          toast.success("Workspace destroyed");
          router.push("/dashboard/code-quality");
        } catch (err) {
          toast.error("Failed to destroy workspace");
        }
      });
    }
  }

  function toggleNode(path: string) {
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  function renderTreeNode(node: TreeNode) {
    const isExpanded = !!expandedNodes[node.path];
    const isSelected = activeFile === node.path;

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => (node.isDir ? toggleNode(node.path) : handleSelectFile(node.path))}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            isSelected
              ? "bg-vault-teal/10 text-vault-teal border border-vault-teal/20"
              : "text-vault-muted hover:text-vault-text hover:bg-vault-elevated/50"
          }`}
          style={{ paddingLeft: `${node.path.split("/").length * 8}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            {node.isDir ? (
              <>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <Folder className="w-3.5 h-3.5 text-vault-teal/75 shrink-0" />
              </>
            ) : (
              <>
                <span className="w-3.5 h-3.5 shrink-0" />
                <File className="w-3.5 h-3.5 text-vault-muted shrink-0" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>
        </div>

        {node.isDir && isExpanded && node.children && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[750px] bg-vault-surface border border-vault-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-vault-border bg-vault-bg shrink-0">
        <div>
          <h2 className="text-sm font-semibold">{repoName}</h2>
          <p className="text-[10px] text-vault-muted mt-0.5">E2B Sandboxed Sandbox Workspace</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!activeFile || isSaving}
            className={`btn-ghost text-xs py-1.5 flex items-center gap-1.5 ${
              isDirty ? "text-vault-teal bg-vault-teal/5 border border-vault-teal/20" : ""
            }`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          <button
            onClick={() => setShowCommitDialog(true)}
            disabled={isCommitting}
            className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
          >
            {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
            Commit & Push
          </button>

          <div className="h-4 w-px bg-vault-border mx-1" />

          <button
            onClick={handleSuspend}
            disabled={isSuspending}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1.5 text-vault-muted hover:text-vault-text"
          >
            <Pause className="w-3.5 h-3.5" />
            Suspend
          </button>

          <button
            onClick={handleDestroy}
            disabled={isDestroying}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1.5 text-red-400 hover:bg-red-950/10 hover:border-red-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Destroy
          </button>
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar File Tree */}
        <div className="w-60 border-r border-vault-border bg-vault-bg p-4 overflow-y-auto shrink-0 space-y-2">
          <span className="text-[10px] uppercase font-bold text-vault-muted tracking-wider block mb-2">Files</span>
          <div className="space-y-1">
            {loadingFiles ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-vault-teal" />
                <span className="text-[10px] text-vault-muted">Loading workspace...</span>
              </div>
            ) : (
              tree.map((node) => renderTreeNode(node))
            )}
          </div>
        </div>

        {/* Monaco Editor & Terminal Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          <div className="flex-1 relative min-h-0">
            {loadingContent && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 z-10">
                <Loader2 className="w-8 h-8 text-vault-teal animate-spin mb-2" />
                <span className="text-xs text-vault-muted">Loading file content...</span>
              </div>
            )}
            {activeFile ? (
              <MonacoEditor
                height="100%"
                theme="vs-dark"
                path={activeFile}
                value={fileContent}
                onChange={(val) => {
                  setFileContent(val || "");
                  setIsDirty(true);
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  renderLineHighlight: "all",
                  tabSize: 2,
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <File className="w-8 h-8 text-vault-muted mb-2 opacity-50" />
                <p className="text-sm font-medium mb-1">No file open</p>
                <p className="text-xs text-vault-muted">Select a file from the sidebar tree to start coding</p>
              </div>
            )}
          </div>

          {/* Terminal Console */}
          <div className="h-72 shrink-0">
            <WorkspaceTerminal workspaceId={workspaceId} />
          </div>
        </div>
      </div>

      {/* Commit Dialog Modal */}
      {showCommitDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 animate-in">
          <div className="bg-vault-surface border border-vault-border rounded-xl p-5 w-[380px] space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-vault-teal" /> Commit and Push Changes
              </h3>
              <p className="text-xs text-vault-muted mt-1">This will commit all changed files inside the sandbox and push them directly to GitHub.</p>
            </div>

            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="vault-input w-full min-h-[80px] text-xs p-2.5"
              placeholder="Commit message..."
            />

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCommitDialog(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitAndPush}
                disabled={isCommitting || !commitMessage.trim()}
                className="btn-primary flex items-center gap-1"
              >
                {isCommitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm & Push
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
