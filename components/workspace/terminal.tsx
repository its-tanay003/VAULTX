"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Terminal, Loader2, CornerDownLeft, Sparkles, AlertCircle } from "lucide-react";
import { runTerminalCommand } from "@/app/actions/workspace";

interface WorkspaceTerminalProps {
  workspaceId: string;
}

interface LogEntry {
  type: "input" | "stdout" | "stderr" | "system";
  text: string;
}

export function WorkspaceTerminal({ workspaceId }: WorkspaceTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: "system", text: "VAULTX Sandboxed Terminal initialized successfully." },
    { type: "system", text: "Network egress firewall active: Outgoing TCP/UDP ports 22, 25, DB ports blocked." },
    { type: "system", text: "Try running: 'npm --version', 'git status', or 'ls -la'." },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on log updates
  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    // Log the user's raw input command line
    setLogs((prev) => [...prev, { type: "input", text: cmd }]);
    setInput("");

    startTransition(async () => {
      try {
        const res = await runTerminalCommand(workspaceId, cmd);

        const newLogs: LogEntry[] = [];
        if (res.stdout) {
          newLogs.push({ type: "stdout", text: res.stdout });
        }
        if (res.stderr) {
          newLogs.push({ type: "stderr", text: res.stderr });
        }
        if (!res.stdout && !res.stderr && res.exitCode === 0) {
          newLogs.push({ type: "system", text: `Command completed with exit code ${res.exitCode}` });
        }

        setLogs((prev) => [...prev, ...newLogs]);
      } catch (err: any) {
        setLogs((prev) => [
          ...prev,
          { type: "stderr", text: err.message || "Command execution crashed." },
        ]);
      }
    });
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-vault-border text-zinc-300 font-mono text-xs select-text overflow-hidden">
      {/* Top Console header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-vault-border bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-vault-teal" />
          <span className="text-[10px] font-semibold text-zinc-400">bash (sandboxed)</span>
        </div>
        <button
          onClick={() =>
            setLogs([
              { type: "system", text: "Terminal logs cleared." },
              { type: "system", text: "Try running: 'npm --version', 'git status', or 'ls -la'." },
            ])
          }
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear Logs
        </button>
      </div>

      {/* Terminal log panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {logs.map((entry, idx) => {
          if (entry.type === "input") {
            return (
              <div key={idx} className="flex items-start gap-1">
                <span className="text-vault-teal font-semibold">vaultx@sandbox:~$</span>
                <span className="text-zinc-100 font-medium break-all">{entry.text}</span>
              </div>
            );
          }
          if (entry.type === "stderr") {
            return (
              <div key={idx} className="text-red-400 whitespace-pre-wrap break-all flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{entry.text}</span>
              </div>
            );
          }
          if (entry.type === "system") {
            return (
              <div key={idx} className="text-zinc-500 italic text-[11px] border-l-2 border-zinc-700 pl-2">
                {entry.text}
              </div>
            );
          }
          return (
            <div key={idx} className="whitespace-pre-wrap break-all text-zinc-300">
              {entry.text}
            </div>
          );
        })}
        <div ref={consoleBottomRef} />
      </div>

      {/* CLI input form */}
      <form
        onSubmit={handleExecute}
        className="flex items-center border-t border-vault-border bg-zinc-900/50 p-2 shrink-0 gap-2"
      >
        <span className="text-vault-teal font-semibold pl-2 shrink-0">~$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-zinc-100 placeholder-zinc-700 caret-vault-teal text-xs py-1"
          placeholder={isPending ? "Executing command inside sandbox..." : "Type command and hit Enter..."}
        />
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 text-vault-teal animate-spin mr-2" />
        ) : (
          <button type="submit" className="text-zinc-500 hover:text-vault-teal transition-colors pr-2 shrink-0">
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </div>
  );
}
