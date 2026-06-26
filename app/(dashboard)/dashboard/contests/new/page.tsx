import { redirect }       from "next/navigation";
import Link                from "next/link";
import { ChevronLeft, Scale } from "lucide-react";
import { createClient }   from "@/lib/supabase/server";
import { createContest }  from "@/app/actions/contests";
import type { Metadata }  from "next";

export const metadata: Metadata = { title: "New Audit Contest" };

export default async function NewContestPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) redirect("/dashboard/contests");

  const tomorrow  = new Date(Date.now() + 86_400_000);
  const weekLater = new Date(Date.now() + 8 * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/contests" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5 text-vault-teal" /> New Audit Contest
          </h1>
          <p className="text-sm text-vault-muted">Pool-based competitive code audit</p>
        </div>
      </div>

      <form action={createContest} className="vault-card p-6 space-y-4">
        <Field label="Contest title">
          <input name="title" required className="vault-input" placeholder="VAULTX Protocol Security Audit" />
        </Field>

        <Field label="Description" hint="What should auditors know about this contest">
          <textarea name="description" required rows={3} className="vault-input resize-none"
            placeholder="Competitive audit of the VAULTX DeFi protocol. Focus on reentrancy, access control, and economic manipulation vectors. The reward pool is distributed proportionally based on severity and uniqueness of findings." />
        </Field>

        <Field label="Repository URL" hint="Public GitHub repo — auditors need read access">
          <input name="repo_url" required type="url" className="vault-input" placeholder="https://github.com/yourorg/protocol" />
        </Field>

        <Field label="Branch" hint="Default: main">
          <input name="repo_branch" className="vault-input" defaultValue="main" placeholder="main" />
        </Field>

        <Field label="Scope description" hint="What files/contracts are in scope">
          <textarea name="scope_description" required rows={3} className="vault-input resize-none"
            placeholder="In scope: contracts/core/*.sol, contracts/tokens/*.sol&#10;Out of scope: contracts/mocks/*, test files, admin scripts" />
        </Field>

        <Field label="Reward pool (USD)" hint="Total amount distributed among valid findings">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted text-sm">$</span>
            <input name="pool_amount" required type="number" min="100" step="100" className="vault-input pl-7" placeholder="10000" />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens at">
            <input name="starts_at" type="datetime-local" required defaultValue={fmt(tomorrow)} className="vault-input" />
          </Field>
          <Field label="Closes at">
            <input name="ends_at" type="datetime-local" required defaultValue={fmt(weekLater)} className="vault-input" />
          </Field>
        </div>

        <Field label="Visibility">
          <select name="is_public" className="vault-input" defaultValue="true">
            <option value="true">Public — visible to all researchers on VAULTX</option>
            <option value="false">Private — invite only</option>
          </select>
        </Field>

        <div className="bg-vault-elevated border border-vault-border rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-medium">Pool distribution formula</p>
          <p className="text-[11px] text-vault-muted leading-relaxed">
            Critical = 10 shares · High = 5 · Medium = 2 · Low = 0.5 · Info = 0
          </p>
          <p className="text-[11px] text-vault-muted leading-relaxed">
            Duplicate findings SPLIT shares rather than getting excluded — all auditors who independently find the same bug receive partial credit.
          </p>
        </div>

        <div className="pt-3 border-t border-vault-border">
          <button type="submit" className="btn-teal w-full">Create Contest</button>
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
