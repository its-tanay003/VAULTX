import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { createEngagement } from "@/app/actions/ptaas";
import type { Metadata }    from "next";

export const metadata: Metadata = { title: "New Engagement" };

export default async function NewEngagementPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) redirect("/dashboard/ptaas");

  // Pull a researcher pool to assign as pentester — top reputation first
  const { data: researchers } = await supabase
    .from("profiles")
    .select("id, full_name, username, reputation")
    .eq("role", "researcher")
    .order("reputation", { ascending: false })
    .limit(25);

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ptaas" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-vault-teal" /> New Engagement
          </h1>
          <p className="text-sm text-vault-muted">Scope a time-boxed penetration test</p>
        </div>
      </div>

      <form action={createEngagement} className="vault-card p-6 space-y-4">
        <Field label="Engagement name">
          <input name="name" required className="vault-input" placeholder="Q3 Public API Penetration Test" />
        </Field>

        <Field label="Scope description" hint="What's in scope — endpoints, applications, network ranges">
          <textarea
            name="scope_description"
            required
            rows={4}
            className="vault-input resize-none"
            placeholder="In scope: api.acme.com, app.acme.com. Out of scope: internal admin tools, third-party integrations."
          />
        </Field>

        <Field label="Objectives" hint="Optional — what should the pentester focus on">
          <textarea
            name="objectives"
            rows={2}
            className="vault-input resize-none"
            placeholder="Focus on authentication flows and the new payments API launched last quarter."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input name="start_date" type="date" required className="vault-input" />
          </Field>
          <Field label="End date">
            <input name="end_date" type="date" required className="vault-input" />
          </Field>
        </div>

        <Field label="Assign pentester" hint="Optional — can assign later">
          <select name="assigned_pentester_id" className="vault-input">
            <option value="">Unassigned for now</option>
            {(researchers ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name ?? r.username} ({r.reputation} pts)
              </option>
            ))}
          </select>
        </Field>

        <div className="pt-3 border-t border-vault-border">
          <button type="submit" className="btn-teal w-full">
            Create Engagement
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
