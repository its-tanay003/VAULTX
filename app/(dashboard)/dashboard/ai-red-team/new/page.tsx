import { redirect }       from "next/navigation";
import Link                from "next/link";
import { ChevronLeft, Zap } from "lucide-react";
import { createClient }   from "@/lib/supabase/server";
import { createTarget }   from "@/app/actions/red-team";
import type { Metadata }  from "next";

export const metadata: Metadata = { title: "New AI Red Team Target" };

export default async function NewTargetPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) redirect("/dashboard/ai-red-team");

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ai-red-team" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-vault-teal" /> New Target
          </h1>
          <p className="text-sm text-vault-muted">Add a target for continuous AI adversarial review</p>
        </div>
      </div>

      <form action={createTarget} className="vault-card p-6 space-y-4">
        <Field label="Target name">
          <input name="name" required className="vault-input" placeholder="Public API Service" />
        </Field>

        <Field label="Target type">
          <select name="target_type" required className="vault-input" defaultValue="github_repo">
            <option value="github_repo">Public GitHub Repository</option>
            <option value="scope_description">Described Scope (threat modeling)</option>
          </select>
        </Field>

        <Field
          label="Target value"
          hint="GitHub URL for repo targets, or a written description for scope targets"
        >
          <textarea
            name="target_value"
            required
            rows={4}
            className="vault-input resize-none"
            placeholder="https://github.com/owner/repo

— or —

A Node.js/Express REST API handling user authentication via JWT, with a Postgres database. Public endpoints include /api/login, /api/users/:id, /api/upload. Uses AWS S3 for file storage."
          />
        </Field>

        <Field label="Aggression level" hint="Controls scan depth and reporting threshold">
          <select name="aggression_level" className="vault-input" defaultValue="standard">
            <option value="passive">Passive — only high-confidence findings, fewer files scanned</option>
            <option value="standard">Standard — balanced depth and confidence threshold</option>
            <option value="aggressive">Aggressive — maximum depth, includes speculative findings</option>
          </select>
        </Field>

        <div className="bg-vault-elevated border border-vault-border rounded-lg p-3">
          <p className="text-[11px] text-vault-muted leading-relaxed">
            The first scan runs immediately after creation. After that, this target is included in the
            daily scheduled scan (via GitHub Actions cron) as long as it's marked active — true continuous
            scanning, not a one-time check.
          </p>
        </div>

        <div className="pt-3 border-t border-vault-border">
          <button type="submit" className="btn-teal w-full">
            Create Target &amp; Run First Scan
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {hint && <span className="font-normal text-vault-muted ml-1.5 text-xs">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
