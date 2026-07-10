import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import { ChevronLeft, Bug }   from "lucide-react";
import { addFinding }         from "@/app/actions/ptaas";
import type { Metadata }      from "next";

interface Props { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Add Finding" };

export default async function NewFindingPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: engagement } = await supabase
    .from("pentest_engagements")
    .select("id, name, assigned_pentester_id")
    .eq("id", params.id)
    .single();

  if (!engagement) notFound();
  if (engagement.assigned_pentester_id !== user.id) notFound();

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/ptaas/${params.id}`} className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Bug className="w-5 h-5 text-vault-teal" /> Add Finding
          </h1>
          <p className="text-sm text-vault-muted">{engagement.name}</p>
        </div>
      </div>

      <form action={addFinding} className="vault-card p-6 space-y-4">
        <input type="hidden" name="engagement_id" value={params.id} />

        <Field label="Title">
          <input name="title" required className="vault-input" placeholder="SQL injection in /api/v2/search query parameter" />
        </Field>

        <Field label="Severity">
          <select name="severity" required className="vault-input">
            <option value="">Select severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            required
            rows={4}
            className="vault-input resize-none"
            placeholder="Describe the vulnerability, where it was found, and how it was discovered."
          />
        </Field>

        <Field label="Steps to reproduce">
          <textarea
            name="steps_to_reproduce"
            rows={4}
            className="vault-input resize-none font-mono text-xs"
            placeholder="1. Navigate to...&#10;2. Send a crafted request...&#10;3. Observe..."
          />
        </Field>

        <Field label="Impact">
          <textarea
            name="impact"
            rows={2}
            className="vault-input resize-none"
            placeholder="What could an attacker accomplish by exploiting this?"
          />
        </Field>

        <div className="pt-3 border-t border-vault-border">
          <button type="submit" className="btn-teal w-full">
            Log Finding
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
