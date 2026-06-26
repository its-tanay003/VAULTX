"use client";

import { useState, useTransition } from "react";
import { Copy, Trash2, Check, Plus, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import type { ApiKey } from "@/app/actions/settings";
import { generateApiKey, revokeApiKey } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

const SCOPES = [
  { id: "read:submissions",  label: "Read Submissions" },
  { id: "write:submissions", label: "Write Submissions" },
  { id: "read:programs",     label: "Read Programs" },
  { id: "read:rewards",      label: "Read Rewards" },
  { id: "read:reports",      label: "Read Reports" },
];

interface ApiKeyTableProps {
  initialKeys: ApiKey[];
}

export function ApiKeyTable({ initialKeys }: ApiKeyTableProps) {
  const [keys, setKeys]         = useState<ApiKey[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:submissions"]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pending, start]        = useTransition();

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function handleGenerate() {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return; }
    if (selectedScopes.length === 0) { toast.error("Select at least one scope"); return; }

    start(async () => {
      try {
        const rawKey = await generateApiKey(newKeyName.trim(), selectedScopes);
        setRevealedKey(rawKey);
        setNewKeyName("");
        setSelectedScopes(["read:submissions"]);
        setShowForm(false);
        // Reload keys — in real app use router.refresh() or optimistic update
        window.location.reload();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to generate key");
      }
    });
  }

  function handleRevoke(keyId: string) {
    start(async () => {
      try {
        await revokeApiKey(keyId);
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
        toast.success("API key revoked");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to revoke key");
      }
    });
  }

  async function copyKey(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Revealed key banner */}
      {revealedKey && (
        <div className="p-4 rounded-lg bg-vault-teal/10 border border-vault-teal/30 space-y-2">
          <p className="text-xs font-medium text-vault-teal">
            ⚠️ Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-vault-surface px-3 py-2 rounded border border-vault-border break-all">
              {revealedKey}
            </code>
            <button
              onClick={() => copyKey(revealedKey)}
              className="p-2 rounded hover:bg-vault-elevated transition-colors text-vault-muted hover:text-vault-text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={() => setRevealedKey(null)} className="text-xs text-vault-muted hover:text-vault-text">
            Dismiss
          </button>
        </div>
      )}

      {/* Key table */}
      {keys.length > 0 ? (
        <div className="divide-y divide-vault-border/50">
          {keys.map((key) => (
            <div key={key.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="w-8 h-8 rounded-lg bg-vault-elevated border border-vault-border flex items-center justify-center shrink-0">
                <Key className="w-3.5 h-3.5 text-vault-muted" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium">{key.name}</p>
                <code className="text-xs text-vault-muted font-mono">{key.prefix}••••••••••••••••</code>
                <div className="flex flex-wrap gap-1 mt-1">
                  {key.scopes.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-vault-elevated border border-vault-border text-vault-muted font-mono"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-vault-muted">
                  Created {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(key.id)}
                disabled={pending}
                className="p-1.5 rounded hover:bg-red-500/10 text-vault-muted hover:text-red-400 transition-colors disabled:opacity-40"
                title="Revoke key"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-vault-muted">No API keys yet.</p>
      )}

      {/* Generate new key form */}
      {showForm ? (
        <div className="space-y-3 pt-3 border-t border-vault-border">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Key name</label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. CI/CD Pipeline"
              className="vault-input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleScope(s.id)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    selectedScopes.includes(s.id)
                      ? "bg-vault-teal/10 border-vault-teal/40 text-vault-teal"
                      : "border-vault-border text-vault-muted hover:border-vault-teal/30"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-vault-border hover:bg-vault-elevated/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={pending}
              className="flex-1 btn-teal text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-vault-teal hover:text-vault-teal/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Generate new key
        </button>
      )}
    </div>
  );
}
