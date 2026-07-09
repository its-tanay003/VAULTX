import { redirect }       from "next/navigation";
import Link                from "next/link";
import { ChevronLeft, Flag } from "lucide-react";
import { createClient }   from "@/lib/supabase/server";
import { createCompetition } from "@/app/actions/ctf";
import type { Metadata }  from "next";

export const metadata: Metadata = { title: "New CTF Competition" };

export default async function NewCompetitionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) redirect("/dashboard/ctf");

  // Default times: starts 1 day from now, runs 48 hours
  const tomorrow = new Date(Date.now() + 86_400_000);
  const afterTwo  = new Date(Date.now() + 3 * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ctf" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Flag className="w-5 h-5 text-vault-teal" /> New CTF Competition
          </h1>
          <p className="text-sm text-vault-muted">Configure your event, then add challenges</p>
        </div>
      </div>

      <form action={createCompetition} className="vault-card p-6 space-y-4">
        <Field label="Competition title">
          <input name="title" required className="vault-input" placeholder="VAULTX Spring CTF 2025" />
        </Field>

        <Field label="Description" hint="Shown to researchers — describe the theme and rules">
          <textarea
            name="description"
            required
            rows={3}
            className="vault-input resize-none"
            placeholder="A web security focused CTF covering authentication bypass, injection attacks, and cryptographic weaknesses. Solve challenges to earn points and climb the scoreboard."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts at">
            <input name="starts_at" type="datetime-local" required defaultValue={fmt(tomorrow)} className="vault-input" />
          </Field>
          <Field label="Ends at">
            <input name="ends_at" type="datetime-local" required defaultValue={fmt(afterTwo)} className="vault-input" />
          </Field>
        </div>

        <Field label="Visibility">
          <select name="is_public" className="vault-input" defaultValue="false">
            <option value="false">Private — invite only (not listed publicly)</option>
            <option value="true">Public — visible to all researchers on VAULTX</option>
          </select>
        </Field>

        <div className="bg-vault-elevated border border-vault-border rounded-lg p-3">
          <p className="text-[11px] text-vault-muted leading-relaxed">
            After creating the competition, you&apos;ll add challenges from the management page.
            The competition stays in &quot;Draft&quot; status until you manually activate it.
          </p>
        </div>

        <div className="pt-3 border-t border-vault-border">
          <button type="submit" className="btn-teal w-full">Create Competition</button>
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
