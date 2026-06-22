"use client";

import { useState, useTransition } from "react";
import { connectRepo }   from "@/app/actions/code-quality";
import { toast }         from "sonner";
import { Github, Plus, Loader2 } from "lucide-react";

export function ConnectRepoForm() {
  const [url,     setUrl]     = useState("");
  const [open,    setOpen]    = useState(false);
  const [pending, start]      = useTransition();

  function handleConnect() {
    if (!url.trim()) { toast.error("Enter a GitHub repository URL"); return; }
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("github_url", url);
        await connectRepo(fd);
      } catch (err: unknown) {
        // redirect() throws internally on success — only show error if it's real
        const msg = err instanceof Error ? err.message : "";
        if (msg && !msg.includes("NEXT_REDIRECT")) {
          toast.error(msg || "Failed to connect repository");
        }
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="vault-card w-full p-5 border-dashed border-2 border-vault-border hover:border-vault-teal/40 hover:bg-vault-teal/5 transition-all flex items-center justify-center gap-2 text-sm text-vault-muted hover:text-vault-teal"
      >
        <Plus className="w-4 h-4" /> Connect a public GitHub repository
      </button>
    );
  }

  return (
    <div className="vault-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Github className="w-4 h-4 text-vault-teal" />
        <h3 className="text-sm font-medium">Connect repository</h3>
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="vault-input flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <button
          onClick={handleConnect}
          disabled={pending}
          className="btn-teal flex items-center gap-2 shrink-0 disabled:opacity-40"
        >
          {pending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
            : "Connect & Scan"}
        </button>
      </div>
      <p className="text-[11px] text-vault-muted mt-2">
        Public repositories only. AI reviews up to 8 priority files for security, performance, and quality issues.
      </p>
    </div>
  );
}
