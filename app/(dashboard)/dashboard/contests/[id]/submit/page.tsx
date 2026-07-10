import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Scale, GitBranch, DollarSign,
  ExternalLink, Bug, CheckCircle2,
} from "lucide-react";
import { submitFinding }      from "@/app/actions/contests";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Metadata }      from "next";

interface Props { params: Promise<{ id: string }> }
export const metadata: Metadata = { title: "Submit Finding" };

export default async function SubmitFindingPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contest } = await supabase
    .from("audit_contests")
    .select("*, contest_findings(auditor_id)")
    .eq("id", params.id)
    .single();

  if (!contest || !contest.is_public) notFound();

  const now      = new Date();
  const isOpen   = contest.status === "open" && new Date(contest.starts_at) <= now && new Date(contest.ends_at) >= now;
  const hasEnded = new Date(contest.ends_at) < now || contest.status !== "open";

  // My prior submissions in this contest
  const { data: myFindings } = await supabase
    .from("contest_findings")
    .select("id, title, severity, status, payout_amount")
    .eq("contest_id", params.id)
    .eq("auditor_id", user.id)
    .order("created_at", { ascending: false });

  const [, owner, repo] = contest.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/i) ?? [];
  const uniqueAuditors  = new Set(
    (Array.isArray(contest.contest_findings) ? contest.contest_findings : []).map((f: any) => f.auditor_id)
  ).size;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/contests" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-vault-teal" /> {contest.title}
          </h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-3 flex-wrap">
            {owner && repo && (
              <a href={contest.repo_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-vault-teal hover:underline">
                <GitBranch className="w-3.5 h-3.5" /> {owner}/{repo} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-vault-teal font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {formatCurrency(Number(contest.pool_amount), contest.pool_currency)} pool
            </span>
            <span>{uniqueAuditors} auditor{uniqueAuditors !== 1 ? "s" : ""} competing</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Submission form */}
        <div className="lg:col-span-2">
          {isOpen ? (
            <form action={submitFinding} className="vault-card p-6 space-y-4">
              <input type="hidden" name="contest_id" value={params.id} />

              <div>
                <h2 className="text-sm font-medium mb-1">Submit a Finding</h2>
                <p className="text-xs text-vault-muted">
                  Duplicate findings are allowed and will split the reward — submit everything you find.
                </p>
              </div>

              <Field label="Title" hint="Short, specific — e.g. 'Reentrancy in withdraw() allows full drain'">
                <input name="title" required className="vault-input" placeholder="Reentrancy vulnerability in Vault.withdraw()" />
              </Field>

              <Field label="Severity">
                <select name="severity" required className="vault-input">
                  <option value="">Select severity</option>
                  <option value="critical">Critical — direct loss of funds, protocol shutdown</option>
                  <option value="high">High — significant impact, high-likelihood exploit</option>
                  <option value="medium">Medium — limited impact or low-likelihood</option>
                  <option value="low">Low — best practice issue, small risk</option>
                  <option value="info">Info — informational, no direct impact</option>
                </select>
              </Field>

              <Field label="Description" hint="Root cause, where it is, why it's exploitable">
                <textarea name="description" required rows={5} className="vault-input resize-none"
                  placeholder="The withdraw() function in Vault.sol sends ETH to msg.sender before updating the user's balance. An attacker can use a fallback function to re-enter withdraw() before the balance is decremented, draining the contract." />
              </Field>

              <Field label="Steps to reproduce">
                <textarea name="steps_to_reproduce" rows={4} className="vault-input resize-none font-mono text-xs"
                  placeholder="1. Deploy AttackContract pointing at Vault&#10;2. Call attack() with 1 ETH&#10;3. AttackContract.fallback() re-enters withdraw()&#10;4. Repeat until Vault is drained" />
              </Field>

              <Field label="Impact">
                <textarea name="impact" rows={2} className="vault-input resize-none"
                  placeholder="Complete loss of all ETH in the Vault contract — estimated $X at current TVL." />
              </Field>

              <Field label="Suggested fix">
                <textarea name="suggested_fix" rows={3} className="vault-input resize-none font-mono text-xs"
                  placeholder="Apply the CEI pattern: update balances[msg.sender] BEFORE the external call.&#10;Consider adding a reentrancy guard (ReentrancyGuard from OpenZeppelin)." />
              </Field>

              <Field label="Affected files" hint="One file path per line">
                <textarea name="affected_files" rows={2} className="vault-input resize-none font-mono text-xs"
                  placeholder="contracts/core/Vault.sol&#10;contracts/core/VaultFactory.sol" />
              </Field>

              <div className="pt-3 border-t border-vault-border">
                <button type="submit" className="btn-teal w-full">Submit Finding</button>
              </div>
            </form>
          ) : (
            <div className="vault-card p-8 text-center">
              <Scale className="w-8 h-8 text-vault-muted mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">
                {hasEnded ? "Contest closed" : `Opens ${formatDate(contest.starts_at)}`}
              </p>
              <p className="text-sm text-vault-muted">
                {hasEnded
                  ? "Submission period has ended. Results will be available after judging."
                  : "Submissions will be accepted when the contest opens."}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: scope + my submissions */}
        <div className="space-y-4">
          <div className="vault-card p-5">
            <h3 className="text-sm font-medium mb-2">Scope</h3>
            <p className="text-xs text-vault-muted leading-relaxed whitespace-pre-wrap">{contest.scope_description}</p>
          </div>

          <div className="vault-card p-5">
            <h3 className="text-sm font-medium mb-2">Distribution</h3>
            <div className="space-y-1.5 text-xs text-vault-muted">
              {[["Critical","10 shares"],["High","5 shares"],["Medium","2 shares"],["Low","0.5 shares"],["Info","0 shares (no payout)"]].map(([sev, shares]) => (
                <div key={sev} className="flex justify-between">
                  <span>{sev}</span><span className="text-vault-subtle">{shares}</span>
                </div>
              ))}
              <p className="pt-2 border-t border-vault-border text-[11px] leading-relaxed">
                Duplicate findings split shares proportionally — submitting a known duplicate still earns partial credit.
              </p>
            </div>
          </div>

          {myFindings && myFindings.length > 0 && (
            <div className="vault-card p-5">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Bug className="w-3.5 h-3.5 text-vault-teal" />
                My Findings ({myFindings.length})
              </h3>
              <div className="divide-y divide-vault-border">
                {myFindings.map((f) => (
                  <div key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-xs font-medium truncate">{f.title}</p>
                    <p className="text-[11px] text-vault-muted capitalize flex items-center gap-1.5 mt-0.5">
                      {f.severity}
                      {f.status === "valid" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {f.payout_amount && <span className="text-vault-teal">{formatCurrency(Number(f.payout_amount))}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
