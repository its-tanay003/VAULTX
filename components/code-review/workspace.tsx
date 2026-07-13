"use client";

import { useEffect, useState, useTransition } from "react";
import { Folder, File, ChevronRight, ChevronDown, Search, Loader2, Play } from "lucide-react";
import { getRepoTree, getFileContentAction } from "@/app/actions/code-review";
import { getReviewSession, saveReviewSession } from "@/app/actions/review-sessions";
import { FileViewer, type FileFinding } from "./file-viewer";
import { toast } from "sonner";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

interface WorkspaceProps {
  repoId: string;
  scanId: string | null;
  findings: any[]; // flat list of findings
}

export function CodeReviewWorkspace({ repoId, scanId, findings }: WorkspaceProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [cursorLine, setCursorLine] = useState(1);

  const [pendingSave, startSave] = useTransition();

  // Convert flat paths to recursive tree
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

    // Sort: directories first, then files alphabetically
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
  };

  // Load tree and session on mount
  useEffect(() => {
    async function init() {
      try {
        const [paths, session] = await Promise.all([
          getRepoTree(repoId),
          getReviewSession(repoId),
        ]);

        const parsedTree = buildTree(paths);
        setTree(parsedTree);

        if (session && session.last_viewed_file) {
          // Verify saved file actually exists in repo tree paths
          if (paths.includes(session.last_viewed_file)) {
            handleSelectFile(session.last_viewed_file, session.cursor_line);
            // Expand parent folders of last viewed file
            const parts = session.last_viewed_file.split("/");
            const newExpanded = { ...expandedNodes };
            for (let i = 0; i < parts.length - 1; i++) {
              const folderPath = parts.slice(0, i + 1).join("/");
              newExpanded[folderPath] = true;
            }
            setExpandedNodes(newExpanded);
          } else if (paths.length > 0) {
            handleSelectFile(paths[0], 1);
          }
        } else if (paths.length > 0) {
          handleSelectFile(paths[0], 1);
        }
      } catch (err) {
        toast.error("Failed to load repository workspace");
      } finally {
        setLoadingTree(false);
      }
    }
    init();
  }, [repoId]);

  // Load selected file content
  async function handleSelectFile(path: string, initialLine = 1) {
    setActiveFile(path);
    setLoadingFile(true);
    setCursorLine(initialLine);
    try {
      const text = await getFileContentAction(repoId, path);
      setFileContent(text);

      // Save session asynchronously
      startSave(async () => {
        try {
          await saveReviewSession(repoId, scanId, path, initialLine);
        } catch (e) {
          // ignore silent fail
        }
      });
    } catch (err) {
      toast.error("Failed to load file contents");
      setFileContent("");
    } finally {
      setLoadingFile(false);
    }
  }

  // Handle cursor moves
  function handleCursorMove(line: number) {
    setCursorLine(line);
    // debounced or transition save
    startSave(async () => {
      if (activeFile) {
        try {
          await saveReviewSession(repoId, scanId, activeFile, line);
        } catch (e) {}
      }
    });
  }

  // Toggle tree directory nodes
  function toggleNode(path: string) {
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  // Get active file findings
  const activeFindings: FileFinding[] = findings
    .filter((f) => {
      // support matching either absolute path or simple relative suffix matching
      const targetFile = (f.file || "").toLowerCase();
      if (!activeFile) return false;
      const current = activeFile.toLowerCase();
      return current.endsWith(targetFile) || targetFile.endsWith(current);
    })
    .map((f) => ({
      line: f.line || 1,
      severity: f.severity || "info",
      message: f.message || f.description || "",
      recommendation: f.recommendation || "",
      category: f.category || "General",
    }));

  // Recursive Tree Node Renderer
  function renderTreeNode(node: TreeNode) {
    const isExpanded = !!expandedNodes[node.path];
    const isSelected = activeFile === node.path;
    const hasSearchMatch = searchQuery
      ? node.path.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Count findings in this node (file or directory recursively)
    const fileFindingsCount = findings.filter((f) => {
      const targetFile = (f.file || "").toLowerCase();
      return targetFile.includes(node.path.toLowerCase());
    }).length;

    if (searchQuery && !hasSearchMatch && !node.isDir) {
      return null;
    }

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

          {fileFindingsCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-950/40 text-red-400 border border-red-900/30">
              {fileFindingsCount}
            </span>
          )}
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
    <div className="flex gap-4 items-stretch h-[600px] animate-in">
      {/* Sidebar Tree */}
      <div className="w-64 shrink-0 flex flex-col bg-vault-surface border border-vault-border rounded-xl overflow-hidden p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="vault-input pl-8 py-1.5 w-full text-xs"
          />
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-auto space-y-1 pr-1">
          {loadingTree ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-vault-teal" />
              <span className="text-[10px] text-vault-muted">Loading file tree...</span>
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center text-[10px] text-vault-muted py-8">No files found</div>
          ) : (
            tree.map((node) => renderTreeNode(node))
          )}
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="flex-1 min-w-0">
        <FileViewer
          content={fileContent}
          path={activeFile || ""}
          findings={activeFindings}
          loading={loadingFile}
          onCursorMove={handleCursorMove}
          initialLine={cursorLine}
        />
      </div>
    </div>
  );
}
