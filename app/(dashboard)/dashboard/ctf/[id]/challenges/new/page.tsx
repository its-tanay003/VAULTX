import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import { ChevronLeft, Flag }  from "lucide-react";
import { createChallenge }    from "@/app/actions/ctf";
import type { Metadata }      from "next";

interface Props { params: Promise<{ id: string }> }
export const metadata: Metadata = { title: "Add Challenge" };

export default async function NewChallengePage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: competition } = await supabase
    .from("ctf_competitions")
    .select("id, title, status, organizations(owner_id)")
    .eq("id", params.id)
    .single();

  if (!competition) notFound();
  const org = Array.isArray(competition.organizations) ? competition.organizations[0] : competition.organizations;
  if (org?.owner_id !== user.id) notFound();
  if (competition.status !== "draft") redirect(`/dashboard/ctf/${params.id}`);

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/ctf/${params.id}`} className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Flag className="w-5 h-5 text-vault-teal" /> Add Challenge
          </h1>
          <p className="text-sm text-vault-muted">{competition.title}</p>
        </div>
      </div>

      <form action={createChallenge} className="vault-card p-6 space-y-4">
        <input type="hidden" name="competition_id" value={params.id} />

        <Field label="Title">
          <input name="title" required className="vault-input" placeholder="Broken Authentication" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select name="category" required className="vault-input">
              <option value="web">Web</option>
              <option value="crypto">Crypto</option>
              <option value="reverse">Reverse Engineering</option>
              <option value="pwn">Pwn</option>
              <option value="forensics">Forensics</option>
              <option value="smart_contract">Smart Contract</option>
              <option value="cloud">Cloud</option>
              <option value="misc">Misc</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select name="difficulty" required className="vault-input">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="insane">Insane</option>
            </select>
          </Field>
        </div>

        <Field label="Description" hint="Shown to players — describe the challenge scenario">
          <textarea
            name="description"
            required
            rows={4}
            className="vault-input resize-none"
            placeholder="The login page of a banking app is vulnerable to a common authentication flaw. Find the vulnerability and retrieve the admin flag.

Target: http://challenge.vaultx.io:8080"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Base points" hint="Full value on first solve">
            <input name="base_points" type="number" min="50" max="5000" defaultValue="500" className="vault-input" />
          </Field>
          <Field label="Min points" hint="Floor after decay">
            <input name="min_points" type="number" min="10" max="500" defaultValue="100" className="vault-input" />
          </Field>
        </div>

        <Field label="Flag" hint="Must follow FLAG{...} format — stored as a hash, never in plaintext">
          <input
            name="flag"
            required
            className="vault-input font-mono"
            placeholder="FLAG{your_secret_flag_here}"
            autoComplete="off"
          />
        </Field>

        <Field label="Hint (optional)" hint="Revealed on request — costs the researcher points">
          <input name="hint" className="vault-input" placeholder="Think about what happens when you submit special characters in the username field…" />
        </Field>

        <Field label="Hint cost">
          <input name="hint_cost" type="number" min="0" max="500" defaultValue="50" className="vault-input" />
        </Field>

        <Field label="Attachment URL (optional)" hint="Direct link to challenge file (hosted separately)">
          <input name="attachment_url" type="url" className="vault-input" placeholder="https://cdn.example.com/challenge.zip" />
        </Field>

        <div className="pt-3 border-t border-vault-border">
          <button type="submit" className="btn-teal w-full">Add Challenge</button>
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
