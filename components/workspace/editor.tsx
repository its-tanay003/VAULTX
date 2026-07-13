"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import MonacoEditor from "@monaco-editor/react";
import {
  Folder, File, ChevronRight, ChevronDown, Save, GitCommit,
  Pause, Trash2, Loader2, Plus, FilePlus, FolderPlus,
  X, Edit2, Sparkles, Terminal as TerminalIcon, AlertCircle, FileCode, HelpCircle, Users
} from "lucide-react";
import {
  getWorkspaceFiles, getWorkspaceFileContent, saveWorkspaceFile,
  commitAndPushWorkspace, suspendWorkspace, destroyWorkspace,
  createWorkspaceFile, createWorkspaceFolder, deleteWorkspacePath, renameWorkspacePath
} from "@/app/actions/workspace";
import {
  getInlineSuggestion,
  generateCodeInWorkspace,
  assistDebugging
} from "@/app/actions/ai-editor";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WorkspaceTerminal } from "./terminal";
import { createClient } from "@/lib/supabase/client";
import * as Y from "yjs";
import { SupabaseYjsProvider } from "@/lib/collaboration/collaboration-provider";

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
  const editorRef = useRef<any>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Sidebar Tab Switcher
  const [sidebarTab, setSidebarTab] = useState<"files" | "ai">("files");

  // Multi-file tabs state
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Cache to store modified content of unsaved open tabs
  const [dirtyCache, setDirtyCache] = useState<Record<string, string>>({});

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [commitMessage, setCommitMessage] = useState("Update workspace files");
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  // File system creation prompts
  const [showCreatePrompt, setShowCreatePrompt] = useState<{ isDir: boolean; parentDir?: string } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [renamePrompt, setRenamePrompt] = useState<{ path: string; oldName: string } | null>(null);

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTargetPath, setAiTargetPath] = useState("");
  const [isGeneratingCode, startGeneratingCode] = useTransition();

  // Debugger assistance states
  const [lastTerminalOutput, setLastTerminalOutput] = useState("");
  const [debugResult, setDebugResult] = useState<{
    explanation: string;
    suggestedFix: string;
    fileToModify: string;
  } | null>(null);
  const [isDebugging, startDebugging] = useTransition();

  const [isSaving, startSave] = useTransition();
  const [isCommitting, startCommit] = useTransition();
  const [isSuspending, startSuspend] = useTransition();
  const [isDestroying, startDestroy] = useTransition();

  const [isInlineCompleting, setIsInlineCompleting] = useState(false);

  // Real-Time Collaboration state refs
  const ydocRef = useRef<Y.Doc | null>(null);
  const collabProviderRef = useRef<SupabaseYjsProvider | null>(null);
  const isSyncingRef = useRef(false);

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

  // Load files list from sandbox
  async function refreshFiles(selectPath?: string) {
    try {
      const paths = await getWorkspaceFiles(workspaceId);
      setFiles(paths);
      setTree(buildTree(paths));
      if (selectPath && paths.includes(selectPath)) {
        handleOpenFile(selectPath);
      }
    } catch (err) {
      toast.error("Failed to load workspace files");
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Handle Real-Time Collaboration Setup on activeFile change
  useEffect(() => {
    // 1. Teardown previous providers
    if (collabProviderRef.current) {
      collabProviderRef.current.destroy();
      collabProviderRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    if (!activeFile) return;

    // 2. Setup Yjs Doc and Supabase collaboration provider
    const ydoc = new Y.Doc();
    const supabase = createClient();
    const safeChannelName = `collab-${workspaceId}-${activeFile.replace(/[^a-zA-Z0-9-_]/g, "-")}`.substring(0, 100);

    const provider = new SupabaseYjsProvider(supabase, safeChannelName, ydoc);
    const ytext = ydoc.getText("content");

    // Pre-populate with current local file content
    if (fileContent && ytext.length === 0) {
      ytext.insert(0, fileContent);
    }

    // Listen for collaborative updates from peer cursors
    ytext.observe((event) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      const textVal = ytext.toString();
      setFileContent(textVal);

      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model && model.getValue() !== textVal) {
          const position = editorRef.current.getPosition();
          editorRef.current.setValue(textVal);
          if (position) editorRef.current.setPosition(position);
        }
      }
      isSyncingRef.current = false;
    });

    ydocRef.current = ydoc;
    collabProviderRef.current = provider;

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  // Open a file and add it to open tabs list
  async function handleOpenFile(path: string) {
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path]);
    }
    setActiveFile(path);
    setLoadingContent(true);

    // If we have unsaved content in cache, load that instead
    if (path in dirtyCache) {
      setFileContent(dirtyCache[path]);
      setIsDirty(true);
      setLoadingContent(false);
      return;
    }

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

  // Save active file changes back to VM filesystem
  function handleSave() {
    if (!activeFile) return;
    startSave(async () => {
      try {
        await saveWorkspaceFile(workspaceId, activeFile, fileContent);
        // Clear dirty cache for this file
        setDirtyCache((prev) => {
          const next = { ...prev };
          delete next[activeFile];
          return next;
        });
        setIsDirty(false);
        toast.success(`Saved ${activeFile.split("/").pop()} successfully`);
      } catch (err) {
        toast.error("Failed to save file");
      }
    });
  }

  // Close an open tab
  function handleCloseFile(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (path in dirtyCache) {
      if (!confirm(`Discard unsaved changes for ${path.split("/").pop()}?`)) return;
    }

    const nextOpen = openFiles.filter((p) => p !== path);
    setOpenFiles(nextOpen);

    // Remove from cache
    setDirtyCache((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });

    if (activeFile === path) {
      if (nextOpen.length > 0) {
        handleOpenFile(nextOpen[nextOpen.length - 1]);
      } else {
        setActiveFile(null);
        setFileContent("");
        setIsDirty(false);
      }
    }
  }

  // Filesystem CRUD triggers
  async function handleCreateItem() {
    if (!newItemName.trim()) return;
    const path = showCreatePrompt?.parentDir
      ? `${showCreatePrompt.parentDir}/${newItemName.trim()}`
      : newItemName.trim();

    try {
      if (showCreatePrompt?.isDir) {
        await createWorkspaceFolder(workspaceId, path);
        toast.success(`Folder ${newItemName} created`);
      } else {
        await createWorkspaceFile(workspaceId, path);
        toast.success(`File ${newItemName} created`);
      }
      setShowCreatePrompt(null);
      setNewItemName("");
      refreshFiles(showCreatePrompt?.isDir ? undefined : path);
    } catch (err) {
      toast.error("Failed to create item");
    }
  }

  async function handleDeleteItem(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${path}?`)) {
      try {
        await deleteWorkspacePath(workspaceId, path);
        toast.success(`${path} deleted`);

        // Close any tabs that were inside deleted path
        const nextOpen = openFiles.filter((p) => !p.startsWith(path));
        setOpenFiles(nextOpen);
        if (activeFile && activeFile.startsWith(path)) {
          if (nextOpen.length > 0) {
            handleOpenFile(nextOpen[nextOpen.length - 1]);
          } else {
            setActiveFile(null);
            setFileContent("");
            setIsDirty(false);
          }
        }

        refreshFiles();
      } catch (err) {
        toast.error("Failed to delete item");
      }
    }
  }

  async function handleRenameItem() {
    if (!renamePrompt || !newItemName.trim()) return;
    const parts = renamePrompt.path.split("/");
    parts[parts.length - 1] = newItemName.trim();
    const newPath = parts.join("/");

    try {
      await renameWorkspacePath(workspaceId, renamePrompt.path, newPath);
      toast.success("Item renamed successfully");
      setRenamePrompt(null);
      setNewItemName("");
      refreshFiles();
    } catch (err) {
      toast.error("Failed to rename item");
    }
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

  // AI Code Generation
  function handleGenerateCode() {
    if (!aiPrompt.trim() || !aiTargetPath.trim()) return;
    startGeneratingCode(async () => {
      try {
        await generateCodeInWorkspace(workspaceId, aiPrompt, aiTargetPath);
        toast.success(`AI successfully generated code for ${aiTargetPath}`);
        setAiPrompt("");
        refreshFiles(aiTargetPath);
      } catch (err) {
        toast.error("Failed to generate code with AI");
      }
    });
  }

  // AI Debugger
  function handleDebugLastCrash() {
    if (!lastTerminalOutput) {
      toast.error("Terminal console logs are empty. Run a command first!");
      return;
    }
    startDebugging(async () => {
      try {
        const res = await assistDebugging(workspaceId, lastTerminalOutput, "");
        setDebugResult(res);
      } catch (err) {
        toast.error("AI debugger failed to analyze logs");
      }
    });
  }

  // Low-latency inline suggestions trigger
  async function triggerInlineSuggestion() {
    if (!activeFile || !editorRef.current) return;
    setIsInlineCompleting(true);

    try {
      const model = editorRef.current.getModel();
      const position = editorRef.current.getPosition();
      const value = model.getValue();
      const offset = model.getOffsetAt(position);
      const prefix = value.substring(0, offset);
      const suffix = value.substring(offset);

      const suggestion = await getInlineSuggestion(activeFile, prefix, suffix);
      if (suggestion) {
        // Insert suggestion at cursor
        editorRef.current.executeEdits("ai-completion", [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: suggestion,
            forceMoveMarkers: true,
          },
        ]);
        toast.success("AI suggestion inserted");
      } else {
        toast.error("No suggestion returned");
      }
    } catch (err) {
      toast.error("Completion error");
    } finally {
      setIsInlineCompleting(false);
    }
  }

  // Suspend VM session
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
          onClick={() => (node.isDir ? toggleNode(node.path) : handleOpenFile(node.path))}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors group ${
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

          {/* Action buttons on hover */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 shrink-0 ml-1">
            {node.isDir && (
              <>
                <button
                  title="New File"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreatePrompt({ isDir: false, parentDir: node.path });
                  }}
                  className="p-0.5 hover:text-vault-teal"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  title="New Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreatePrompt({ isDir: true, parentDir: node.path });
                  }}
                  className="p-0.5 hover:text-vault-teal"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                setNewItemName(node.name);
                setRenamePrompt({ path: node.path, oldName: node.name });
              }}
              className="p-0.5 hover:text-vault-teal"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              title="Delete"
              onClick={(e) => handleDeleteItem(node.path, e)}
              className="p-0.5 hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
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
    <div className="flex flex-col h-[800px] bg-vault-surface border border-vault-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-vault-border bg-vault-bg shrink-0">
        <div>
          <h2 className="text-sm font-semibold">{repoName}</h2>
          <p className="text-[10px] text-vault-muted mt-0.5 flex items-center gap-1.5">
            E2B Sandboxed IDE Workspace
            <span className="flex items-center gap-1 text-vault-teal bg-vault-teal/5 px-1.5 py-0.5 rounded border border-vault-teal/15 font-semibold text-[9px] uppercase tracking-wider">
              <Users className="w-3 h-3" /> Live Collaboration Active
            </span>
          </p>
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
        {/* Left Side Sidebar - Tabs for Files and AI */}
        <div className="w-72 border-r border-vault-border bg-vault-bg flex flex-col shrink-0 min-h-0">
          {/* Tab Selection */}
          <div className="grid grid-cols-2 border-b border-vault-border shrink-0 h-9 bg-vault-surface">
            <button
              onClick={() => setSidebarTab("files")}
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                sidebarTab === "files"
                  ? "border-vault-teal text-vault-text"
                  : "border-transparent text-vault-muted hover:text-vault-text"
              }`}
            >
              <File className="w-3.5 h-3.5" /> Files
            </button>
            <button
              onClick={() => setSidebarTab("ai")}
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                sidebarTab === "ai"
                  ? "border-vault-teal text-vault-text"
                  : "border-transparent text-vault-muted hover:text-vault-text"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-vault-teal" /> AI Agent
            </button>
          </div>

          {/* Files Explorer Panel */}
          {sidebarTab === "files" ? (
            <div className="flex-1 p-4 overflow-y-auto min-h-0 flex flex-col space-y-2">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-[10px] uppercase font-bold text-vault-muted tracking-wider">Explorer</span>
                <div className="flex items-center gap-1.5">
                  <button
                    title="New File at Root"
                    onClick={() => setShowCreatePrompt({ isDir: false })}
                    className="p-1 rounded hover:bg-vault-elevated text-vault-muted hover:text-vault-teal transition-colors"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="New Folder at Root"
                    onClick={() => setShowCreatePrompt({ isDir: true })}
                    className="p-1 rounded hover:bg-vault-elevated text-vault-muted hover:text-vault-teal transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
                {loadingFiles ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin text-vault-teal" />
                    <span className="text-[10px] text-vault-muted">Loading files...</span>
                  </div>
                ) : (
                  tree.map((node) => renderTreeNode(node))
                )}
              </div>
            </div>
          ) : (
            // AI Assistant Tab Panel
            <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-5">
              {/* AI Code Generator */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-vault-muted tracking-wider flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-vault-teal" /> AI Code Generator
                </span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={aiTargetPath}
                    onChange={(e) => setAiTargetPath(e.target.value)}
                    className="vault-input w-full text-xs p-2.5 placeholder-zinc-600"
                    placeholder="Target file path (e.g. src/utils.js)"
                  />
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="vault-input w-full min-h-[90px] text-xs p-2.5 placeholder-zinc-600"
                    placeholder="Explain what the AI should write or edit inside the file..."
                  />
                  <button
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode || !aiPrompt.trim() || !aiTargetPath.trim()}
                    className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingCode ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Code...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Generate & Write File
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="h-px bg-vault-border" />

              {/* AI Debugging Panel */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-vault-muted tracking-wider flex items-center gap-1">
                  <TerminalIcon className="w-3.5 h-3.5 text-vault-teal" /> AI Debugging Companion
                </span>
                <div className="space-y-2">
                  <p className="text-[11px] text-vault-muted">
                    Analyzes current sandboxed terminal crash logs and proposes clean fixes.
                  </p>
                  <button
                    onClick={handleDebugLastCrash}
                    disabled={isDebugging}
                    className="btn-ghost text-xs w-full py-2 flex items-center justify-center gap-1.5"
                  >
                    {isDebugging ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing Logs...
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3.5 h-3.5" /> Debug Terminal Output
                      </>
                    )}
                  </button>

                  {debugResult && (
                    <div className="bg-zinc-900 border border-vault-border rounded-xl p-3 space-y-2.5 animate-in text-[11px]">
                      <div>
                        <span className="font-bold text-zinc-400 block mb-0.5">EXPLANATION</span>
                        <p className="text-zinc-300 leading-relaxed">{debugResult.explanation}</p>
                      </div>

                      {debugResult.fileToModify && (
                        <div>
                          <span className="font-bold text-zinc-400 block mb-0.5">FILE TO MODIFY</span>
                          <button
                            onClick={() => handleOpenFile(debugResult.fileToModify)}
                            className="text-vault-teal font-semibold hover:underline flex items-center gap-1 break-all"
                          >
                            <File className="w-3.5 h-3.5 shrink-0" />
                            {debugResult.fileToModify}
                          </button>
                        </div>
                      )}

                      {debugResult.suggestedFix && (
                        <div>
                          <span className="font-bold text-zinc-400 block mb-0.5">SUGGESTED CHANGES</span>
                          <pre className="bg-black p-2 rounded text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-tight">
                            {debugResult.suggestedFix}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monaco Editor & Terminal Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          {/* Open Tabs Headers */}
          <div className="flex items-center justify-between bg-zinc-900 border-b border-vault-border shrink-0 h-9 px-2">
            <div className="flex items-center overflow-x-auto scrollbar-none h-full flex-1">
              {openFiles.map((path) => {
                const isActive = activeFile === path;
                const hasUnsaved = path in dirtyCache;
                return (
                  <div
                    key={path}
                    onClick={() => handleOpenFile(path)}
                    className={`flex items-center gap-2 px-4 h-full border-r border-vault-border text-xs cursor-pointer select-none transition-colors shrink-0 ${
                      isActive
                        ? "bg-zinc-950 text-vault-teal font-semibold border-t-2 border-t-vault-teal"
                        : "text-zinc-400 hover:bg-zinc-950/50 hover:text-zinc-200"
                    }`}
                  >
                    <File className="w-3.5 h-3.5 opacity-60" />
                    <span className="truncate max-w-[120px]">{path.split("/").pop()}</span>
                    {hasUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-vault-teal shrink-0" />}
                    <button
                      onClick={(e) => handleCloseFile(path, e)}
                      className="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Monaco Helper Actions (Inline Completion shortcut) */}
            {activeFile && (
              <button
                onClick={triggerInlineSuggestion}
                disabled={isInlineCompleting}
                className="btn-ghost py-1 text-[10px] font-semibold flex items-center gap-1.5 text-vault-teal hover:bg-vault-teal/5 bg-vault-teal/5 border border-vault-teal/20 rounded mr-2"
              >
                {isInlineCompleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                AI Autocomplete
              </button>
            )}
          </div>

          {/* Monaco Frame */}
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
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                onChange={(val) => {
                  setFileContent(val || "");
                  setIsDirty(true);
                  // Cache unsaved tab edits
                  setDirtyCache((prev) => ({ ...prev, [activeFile]: val || "" }));

                  // Propagate local mutations over CRDT document
                  if (ydocRef.current && !isSyncingRef.current) {
                    isSyncingRef.current = true;
                    const ytext = ydocRef.current.getText("content");
                    ydocRef.current.transact(() => {
                      ytext.delete(0, ytext.length);
                      ytext.insert(0, val || "");
                    });
                    isSyncingRef.current = false;
                  }
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
                <p className="text-sm font-medium mb-1">No open tabs</p>
                <p className="text-xs text-vault-muted">Select or create a file to start coding</p>
              </div>
            )}
          </div>

          {/* Terminal Console */}
          <div className="h-72 shrink-0">
            <WorkspaceTerminal
              workspaceId={workspaceId}
              onLogsChange={(logText) => setLastTerminalOutput(logText)}
            />
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

      {/* Create Prompt Modal */}
      {showCreatePrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 animate-in">
          <div className="bg-vault-surface border border-vault-border rounded-xl p-5 w-[320px] space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-semibold">
                Create New {showCreatePrompt.isDir ? "Folder" : "File"}
              </h3>
              {showCreatePrompt.parentDir && (
                <p className="text-[10px] text-vault-muted mt-1">Inside: {showCreatePrompt.parentDir}</p>
              )}
            </div>

            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="vault-input w-full text-xs p-2"
              placeholder={showCreatePrompt.isDir ? "folder-name" : "file-name.js"}
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setShowCreatePrompt(null);
                  setNewItemName("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                disabled={!newItemName.trim()}
                className="btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Prompt Modal */}
      {renamePrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 animate-in">
          <div className="bg-vault-surface border border-vault-border rounded-xl p-5 w-[320px] space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-semibold">Rename Item</h3>
              <p className="text-[10px] text-vault-muted mt-1">Old name: {renamePrompt.oldName}</p>
            </div>

            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="vault-input w-full text-xs p-2"
              placeholder="New name"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setRenamePrompt(null);
                  setNewItemName("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameItem}
                disabled={!newItemName.trim() || newItemName.trim() === renamePrompt.oldName}
                className="btn-primary"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
