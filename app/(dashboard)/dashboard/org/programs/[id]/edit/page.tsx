"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter }               from "next/navigation";
import { createClient }                       from "@/lib/supabase/client";
import { updateProgram }                      from "@/app/actions/programs";
import { toast }      from "sonner";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import Link  from "next/link";
import { cn } from "@/lib/utils";
import type { Program } from "@/lib/supabase/types";

export default function EditProgramPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();
  const [pending, start] = useTransition();

  const [program, setProgram]     = useState<Program | null>(null);
  const [loading, setLoading]     = useState(true);

  // Form fields
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [rules,       setRules]       = useState("");
  const [scopeIn,     setScopeIn]     = useState("");
  const [scopeOut,    setScopeOut]    = useState("");
  const [minReward,   setMinReward]   = useState("");
  const [maxReward,   setMaxReward]   = useState("");
  const [isPublic,    setIsPublic]    = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) { router.replace("/dashboard/org/programs"); return; }

      setProgram(data);
      setName(data.name);
      setDescription(data.description);
      setRules(data.rules);
      setScopeIn(data.scope_in.join("\n"));
      setScopeOut(data.scope_out.join("\n"));
      setMinReward(data.min_reward ? String(data.min_reward) : "");
      setMaxReward(data.max_reward ? String(data.max_reward) : "");
      setIsPublic(data.is_public);
      setLoading(false);
    }
    load();
  }, [id]);

  function handleSave() {
    if (!program) return;
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("name",        name);
        fd.set("description", description);
        fd.set("rules",       rules);
        fd.set("scope_in",    scopeIn);
        fd.set("scope_out",   scopeOut);
        fd.set("min_reward",  minReward);
        fd.set("max_reward",  maxReward);
        fd.set("is_public",   String(isPublic));
        fd.set("status",      program.status);
        await updateProgram(id, fd);
        toast.success("Program updated");
        router.push(`/dashboard/org/programs/${id}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update program");
      }
    });
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-in">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/org/programs/${id}`} className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Edit Program</h1>
          <p className="text-sm text-vault-muted">{program?.name}</p>
        </div>
      </div>

      <div className="vault-card p-6 space-y-5">
        <Field label="Program name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className="vault-input" />
        </Field>

        <Field label="Description" required>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="vault-input resize-none"
          />
        </Field>

        <Field label="Rules & safe harbor">
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={5}
            className="vault-input resize-none"
          />
        </Field>

        <Field label="In-scope assets" hint="One per line">
          <textarea
            value={scopeIn}
            onChange={(e) => setScopeIn(e.target.value)}
            rows={4}
            placeholder={"https://app.example.com\nhttps://api.example.com"}
            className="vault-input resize-none font-mono text-xs"
          />
        </Field>

        <Field label="Out-of-scope assets" hint="One per line">
          <textarea
            value={scopeOut}
            onChange={(e) => setScopeOut(e.target.value)}
            rows={3}
            placeholder={"https://staging.example.com"}
            className="vault-input resize-none font-mono text-xs"
          />
        </Field>

        {program?.type === "bug_bounty" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Min reward (USD)">
              <input
                type="number"
                value={minReward}
                onChange={(e) => setMinReward(e.target.value)}
                className="vault-input"
                placeholder="50"
              />
            </Field>
            <Field label="Max reward (USD)">
              <input
                type="number"
                value={maxReward}
                onChange={(e) => setMaxReward(e.target.value)}
                className="vault-input"
                placeholder="10000"
              />
            </Field>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-vault-border gap-3">
          <Link href={`/dashboard/org/programs/${id}`} className="btn-ghost">
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={pending || !name.trim() || !description.trim()}
            className="btn-teal flex items-center gap-2 disabled:opacity-40"
          >
            {pending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-vault-teal ml-0.5">*</span>}
        {hint && <span className="font-normal text-vault-muted ml-1.5 text-xs">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
