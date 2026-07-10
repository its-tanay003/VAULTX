import { createClient }   from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                  from "next/link";
import {
  ChevronLeft, Bug, Trophy, Clock, Globe, Shield,
  CheckCircle2, XCircle, ChevronRight, AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("programs").select("name").eq("id", params.id).single();
  return { title: data?.name ?? "Program" };
}

export default async function ResearcherProgramDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: program } = await supabase
    .from("programs")
    .select("*, organizations!inner(name, logo_url, website)")
    .eq("id", params.id)
    .single();

  if (!program || program.status !== "active") notFound();

  // Has this researcher already submitted here?
  const { data: myReports } = await supabase
    .from("submissions")
    .select("id, title, severity, status, created_at")
    .eq("program_id", params.id)
    .eq("researcher_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const org = Array.isArray(program.organizations)
    ? program.organizations[0]
    : program.organizations;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/researcher/programs"
          className="text-vault-muted hover:text-vault-text transition-colors mt-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center text-vault-teal font-semibold shrink-0">
                {org?.name?.[0] ?? "?"}
              </div>
              <div>
                <h1 className="text-xl font-semibold">{program.name}</h1>
                <p className="text-sm text-vault-muted mt-0.5">
                  {org?.name}
                  {org?.website && (
                    <> · <a href={org.website} target="_blank" rel="noopener noreferrer"
                      className="text-vault-teal hover:underline">{org.website.replace("https://", "")}</a></>
                  )}
                </p>
              </div>
            </div>

            <Link
              href={`/dashboard/researcher/submissions/new?program=${program.id}`}
              className="btn-teal flex items-center gap-2"
            >
              <Bug className="w-4 h-4" />
              Submit Report
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          <div className="vault-card p-5">
            <h2 className="text-sm font-medium mb-3">About this program</h2>
            <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">
              {program.description}
            </p>
          </div>

          {/* Scope */}
          <div className="vault-card p-5">
            <h2 className="text-sm font-medium mb-4">Scope</h2>

            <div className="mb-5">
              <p className="text-xs font-medium text-vault-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> In scope
              </p>
              {program.scope_in.length === 0 ? (
                <p className="text-sm text-vault-muted italic">Not specified — contact org for details</p>
              ) : (
                <ul className="space-y-2">
                  {program.scope_in.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <code className="text-xs font-mono text-vault-subtle">{item}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {program.scope_out.length > 0 && (
              <div>
                <p className="text-xs font-medium text-vault-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" /> Out of scope
                </p>
                <ul className="space-y-2">
                  {program.scope_out.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <code className="text-xs font-mono text-vault-subtle">{item}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rules */}
          {program.rules && (
            <div className="vault-card p-5">
              <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-vault-teal" /> Rules & Safe Harbor
              </h2>
              <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">
                {program.rules}
              </p>
            </div>
          )}

          {/* My reports on this program */}
          {myReports && myReports.length > 0 && (
            <div className="vault-card">
              <div className="flex items-center justify-between p-4 border-b border-vault-border">
                <h2 className="text-sm font-medium">My Reports Here</h2>
                <span className="text-xs text-vault-muted">{myReports.length} report{myReports.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-vault-border">
                {myReports.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/dashboard/researcher/submissions/${sub.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
                  >
                    <StatusDot status={sub.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                        {sub.title}
                      </p>
                      <p className="text-xs text-vault-muted mt-0.5">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <SevBadge sev={sub.severity} />
                    <ChevronRight className="w-4 h-4 text-vault-muted shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="vault-card p-4 space-y-3">
            <h3 className="text-sm font-medium mb-1">Program details</h3>

            <Detail icon={<Trophy className="w-3.5 h-3.5 text-vault-teal" />} label="Rewards">
              {program.type === "vdp"
                ? "VDP — recognition only"
                : program.min_reward && program.max_reward
                ? `${formatCurrency(program.min_reward)} – ${formatCurrency(program.max_reward)}`
                : "Negotiable"}
            </Detail>

            <Detail icon={<Clock className="w-3.5 h-3.5 text-vault-teal" />} label="Response time">
              ~{program.avg_response_hours}h average
            </Detail>

            <Detail icon={<Bug className="w-3.5 h-3.5 text-vault-teal" />} label="Total reports">
              {program.total_submissions}
            </Detail>

            <Detail icon={<Globe className="w-3.5 h-3.5 text-vault-teal" />} label="Visibility">
              {program.is_public ? "Public" : "Private"}
            </Detail>

            <Detail icon={<Shield className="w-3.5 h-3.5 text-vault-teal" />} label="Launched">
              {formatDate(program.created_at)}
            </Detail>
          </div>

          <div className="vault-card p-4 border-yellow-900/30">
            <div className="flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-yellow-400 mb-1">Important</p>
                <p className="text-xs text-vault-muted leading-relaxed">
                  AI pre-screens all submissions for duplicates and suggests severity.
                  Always ensure your report is unique and includes clear proof of concept.
                </p>
              </div>
            </div>
          </div>

          <Link
            href={`/dashboard/researcher/submissions/new?program=${program.id}`}
            className="btn-teal w-full flex items-center justify-center gap-2 py-3"
          >
            <Bug className="w-4 h-4" />
            Submit a Report
          </Link>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm py-1.5 border-b border-vault-border/50 last:border-0">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-vault-muted w-24 shrink-0">{label}</span>
      <span className="text-vault-text font-medium flex-1">{children}</span>
    </div>
  );
}

const SEV_MAP: Record<string, string> = {
  critical: "text-red-400 bg-red-950/50 border-red-900/50",
  high:     "text-orange-400 bg-orange-950/50 border-orange-900/50",
  medium:   "text-yellow-400 bg-yellow-950/50 border-yellow-900/50",
  low:      "text-blue-400 bg-blue-950/50 border-blue-900/50",
  info:     "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",
};

function SevBadge({ sev }: { sev: string }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize shrink-0 ${SEV_MAP[sev] ?? SEV_MAP.info}`}>
      {sev}
    </span>
  );
}

const STATUS_DOTS: Record<string, string> = {
  new: "bg-sky-400", triaging: "bg-violet-400", accepted: "bg-emerald-400",
  rejected: "bg-red-400", duplicate: "bg-zinc-500", needs_info: "bg-yellow-400",
  resolved: "bg-teal-400", wont_fix: "bg-zinc-600",
};

function StatusDot({ status }: { status: string }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOTS[status] ?? "bg-zinc-500"}`} />;
}
