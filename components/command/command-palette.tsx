"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter }     from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient }  from "@/lib/supabase/client";
import {
  Search, Target, Bug, Trophy, BarChart3, Code2,
  Bell, Settings, Plus, ArrowRight, CornerDownLeft,
} from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

interface Props {
  open:    boolean;
  onClose: () => void;
  role:    UserRole;
}

interface CommandItem {
  id:       string;
  label:    string;
  sublabel?:string;
  icon:     React.ReactNode;
  action:   () => void;
  group:    string;
}

interface SearchResult {
  id:    string;
  title: string;
  type:  "submission" | "program";
  href:  string;
}

export function CommandPalette({ open, onClose, role }: Props) {
  const router        = useRouter();
  const inputRef       = useRef<HTMLInputElement>(null);
  const [query,  setQuery]  = useState("");
  const [results,setResults]= useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searching, setSearching] = useState(false);

  const isOrg = role === "org" || role === "triager";
  const base  = isOrg ? "/dashboard/org" : "/dashboard/researcher";

  // Static navigation commands
  const NAV_COMMANDS: CommandItem[] = isOrg ? [
    { id: "nav-overview",    label: "Go to Overview",      icon: <BarChart3 className="w-4 h-4" />, action: () => navigate(base), group: "Navigate" },
    { id: "nav-programs",    label: "Go to Programs",      icon: <Target className="w-4 h-4" />,     action: () => navigate(`${base}/programs`), group: "Navigate" },
    { id: "nav-submissions", label: "Go to Submissions",   icon: <Bug className="w-4 h-4" />,        action: () => navigate(`${base}/submissions`), group: "Navigate" },
    { id: "nav-rewards",     label: "Go to Rewards",       icon: <Trophy className="w-4 h-4" />,     action: () => navigate(`${base}/rewards`), group: "Navigate" },
    { id: "nav-code",        label: "Go to Code Quality",  icon: <Code2 className="w-4 h-4" />,      action: () => navigate("/dashboard/code-quality"), group: "Navigate" },
    { id: "new-program",     label: "Create New Program",  icon: <Plus className="w-4 h-4" />,       action: () => navigate(`${base}/programs/new`), group: "Actions" },
  ] : [
    { id: "nav-overview",    label: "Go to Overview",      icon: <BarChart3 className="w-4 h-4" />, action: () => navigate(base), group: "Navigate" },
    { id: "nav-programs",    label: "Browse Programs",     icon: <Target className="w-4 h-4" />,     action: () => navigate(`${base}/programs`), group: "Navigate" },
    { id: "nav-submissions", label: "Go to My Reports",    icon: <Bug className="w-4 h-4" />,        action: () => navigate(`${base}/submissions`), group: "Navigate" },
    { id: "nav-rewards",     label: "Go to Earnings",      icon: <Trophy className="w-4 h-4" />,     action: () => navigate(`${base}/rewards`), group: "Navigate" },
    { id: "nav-leaderboard", label: "Go to Leaderboard",   icon: <BarChart3 className="w-4 h-4" />,  action: () => navigate(`${base}/leaderboard`), group: "Navigate" },
    { id: "nav-code",        label: "Go to Code Quality",  icon: <Code2 className="w-4 h-4" />,      action: () => navigate("/dashboard/code-quality"), group: "Navigate" },
    { id: "new-submission",  label: "Submit New Report",   icon: <Plus className="w-4 h-4" />,       action: () => navigate(`${base}/submissions/new`), group: "Actions" },
  ];

  const COMMON_COMMANDS: CommandItem[] = [
    { id: "nav-notifications", label: "Go to Notifications", icon: <Bell className="w-4 h-4" />,     action: () => navigate("/dashboard/notifications"), group: "Navigate" },
    { id: "nav-settings",      label: "Go to Settings",      icon: <Settings className="w-4 h-4" />, action: () => navigate("/dashboard/settings"), group: "Navigate" },
  ];

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  // Debounced search across submissions/programs
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }

    setSearching(true);
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const [{ data: subs }, { data: progs }] = await Promise.all([
        supabase
          .from("submissions")
          .select("id, title")
          .ilike("title", `%${query}%`)
          .limit(5),
        supabase
          .from("programs")
          .select("id, name")
          .ilike("name", `%${query}%`)
          .limit(5),
      ]);

      const subResults: SearchResult[] = (subs ?? []).map((s) => ({
        id: s.id, title: s.title, type: "submission",
        href: `${base}/submissions/${s.id}`,
      }));
      const progResults: SearchResult[] = (progs ?? []).map((p) => ({
        id: p.id, title: p.name, type: "program",
        href: `${base}/programs/${p.id}`,
      }));

      setResults([...subResults, ...progResults]);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredStatic = [...NAV_COMMANDS, ...COMMON_COMMANDS].filter(
    (cmd) => cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const allCommands: CommandItem[] = query.trim().length >= 2
    ? [
        ...filteredStatic,
        ...results.map((r) => ({
          id: r.id,
          label: r.title,
          sublabel: r.type === "submission" ? "Submission" : "Program",
          icon: r.type === "submission" ? <Bug className="w-4 h-4" /> : <Target className="w-4 h-4" />,
          action: () => navigate(r.href),
          group: r.type === "submission" ? "Submissions" : "Programs",
        })),
      ]
    : [...NAV_COMMANDS, ...COMMON_COMMANDS];

  // Keyboard navigation within the list
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, allCommands.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); allCommands[selectedIdx]?.action(); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, allCommands, selectedIdx]);

  const grouped = allCommands.reduce((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101] px-4"
          >
            <div className="vault-card overflow-hidden shadow-2xl border-vault-border-bright">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-vault-border">
                <Search className="w-4 h-4 text-vault-muted shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
                  placeholder="Search or jump to..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-vault-muted"
                />
                <kbd className="text-[10px] px-1.5 py-0.5 bg-vault-elevated border border-vault-border rounded font-mono text-vault-muted">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {searching && (
                  <div className="px-4 py-6 text-center text-xs text-vault-muted">Searching…</div>
                )}

                {!searching && allCommands.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-vault-muted">
                    No results for "{query}"
                  </div>
                )}

                {!searching && Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="mb-1 last:mb-0">
                    <p className="px-4 py-1.5 text-[10px] font-medium text-vault-muted uppercase tracking-wider">
                      {group}
                    </p>
                    {items.map((cmd) => {
                      const globalIdx = allCommands.indexOf(cmd);
                      const isSelected = globalIdx === selectedIdx;
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIdx(globalIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                            isSelected ? "bg-vault-teal/10 text-vault-teal" : "text-vault-subtle hover:bg-vault-elevated"
                          }`}
                        >
                          <span className={isSelected ? "text-vault-teal" : "text-vault-muted"}>
                            {cmd.icon}
                          </span>
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.sublabel && (
                            <span className="text-[10px] text-vault-muted shrink-0">{cmd.sublabel}</span>
                          )}
                          {isSelected && <CornerDownLeft className="w-3 h-3 text-vault-teal shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-vault-border text-[10px] text-vault-muted">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-vault-elevated border border-vault-border rounded">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-vault-elevated border border-vault-border rounded">↵</kbd> Select
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
