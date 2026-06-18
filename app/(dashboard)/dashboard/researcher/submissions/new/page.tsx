"use client";

import { useState, useTransition, useRef } from "react";
import { useSearchParams, useRouter }       from "next/navigation";
import { createSubmission }                 from "@/app/actions/submissions";
import { createClient }                     from "@/lib/supabase/client";
import { toast }  from "sonner";
import {
  Bug, ChevronLeft, Loader2, Upload, X,
  AlertTriangle, CheckCircle2, Info,
  Shield, Zap, ChevronRight,
} from "lucide-react";
import Link   from "next/link";
import { cn } from "@/lib/utils";
import type { SeverityLevel } from "@/lib/supabase/types";

type Step = "details" | "reproduce" | "impact" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "details",   label: "Details"    },
  { key: "reproduce", label: "Reproduce"  },
  { key: "impact",    label: "Impact"     },
  { key: "review",    label: "Review"     },
];

const SEVERITY_OPTIONS: {
  value: SeverityLevel;
  label: string;
  desc:  string;
  example: string;
  cls: string;
}[] = [
  {
    value: "critical",
    label: "Critical",
    desc:  "Remote code execution, auth bypass, mass data exposure",
    example: "e.g. Unauthenticated RCE on production server",
    cls:  "border-red-900/50 bg-red-950/30 text-red-400",
  },
  {
    value: "high",
    label: "High",
    desc:  "Significant data exposure, privilege escalation, SSRF",
    example: "e.g. IDOR leaking all user PII",
    cls:  "border-orange-900/50 bg-orange-950/30 text-orange-400",
  },
  {
    value: "medium",
    label: "Medium",
    desc:  "Limited data exposure, CSRF, stored XSS",
    example: "e.g. Stored XSS in profile page",
    cls:  "border-yellow-900/50 bg-yellow-950/30 text-yellow-400",
  },
  {
    value: "low",
    label: "Low",
    desc:  "Minor info disclosure, rate limiting issues, self-XSS",
    example: "e.g. Username enumeration via timing",
    cls:  "border-blue-900/50 bg-blue-950/30 text-blue-400",
  },
  {
    value: "info",
    label: "Informational",
    desc:  "Best practice violations, minor misconfigs",
    example: "e.g. Missing security headers",
    cls:  "border-zinc-700/50 bg-zinc-800/30 text-zinc-400",
  },
];

export default function NewSubmissionPage() {
  const searchParams = useSearchParams();
  const programId    = searchParams.get("program") ?? "";
  const router       = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step,    setStep]    = useState<Step>("details");
  const [pending, start]      = useTransition();

  // Form state
  const [title,    setTitle]    = useState("");
  const [severity, setSeverity] = useState<SeverityLevel | "">("");
  const [desc,     setDesc]     = useState("");
  const [steps,    setSteps]    = useState("");
  const [impact,   setImpact]   = useState("");
  const [files,    setFiles]    = useState<File[]>([]);

  const stepIdx    = STEPS.findIndex((s) => s.key === step);
  const canDetails = title.trim().length >= 10 && severity !== "";
  const canRepro   = steps.trim().length >= 20;
  const canAdvance =
    step === "details"   ? canDetails :
    step === "reproduce" ? canRepro :
    true;

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const valid  = picked.filter((f) => f.size <= 2 * 1024 * 1024);
    if (valid.length < picked.length) toast.error("Some files exceed 2MB limit");
    setFiles((prev) => [...prev, ...valid].slice(0, 5)); // max 5 files
    e.target.value = "";
  }

  function handleSubmit() {
    if (!programId) { toast.error("No program selected"); return; }
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("program_id",          programId);
        fd.set("title",               title);
        fd.set("severity",            severity);
        fd.set("description",         desc);
        fd.set("steps_to_reproduce",  steps);
        fd.set("impact",              impact);
        await createSubmission(fd);
        toast.success("Report submitted! 🎯");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Submission failed");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={programId ? `/dashboard/researcher/programs/${programId}` : "/dashboard/researcher/programs"}
          className="text-vault-muted hover:text-vault-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Submit Report</h1>
          <p className="text-sm text-vault-muted">AI will pre-screen for duplicates automatically</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="vault-card p-4">
        <div className="flex items-center">
          {STEPS.map(({ key, label }, i) => (
            <div key={key} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < stepIdx && setStep(key)}
                className={cn("flex items-center gap-2 shrink-0", i < stepIdx ? "cursor-pointer" : "cursor-default")}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                  i < stepIdx  ? "bg-vault-teal border-vault-teal text-vault-bg"
                  : i === stepIdx ? "border-vault-teal text-vault-teal bg-vault-teal/10"
                  : "border-vault-border text-vault-muted"
                )}>
                  {i < stepIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  i === stepIdx ? "text-vault-text" : "text-vault-muted"
                )}>{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1 mx-2 transition-colors", i < stepIdx ? "bg-vault-teal" : "bg-vault-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="vault-card p-6">

        {/* ── Step 1: Details ─────────────────────────────────────────────── */}
        {step === "details" && (
          <div className="space-y-5">
            <div>
              <label className="field-label">
                Vulnerability title <span className="text-vault-teal">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SQL injection in /api/v1/users endpoint allows data exfiltration"
                className="vault-input mt-1.5"
              />
              <div className="flex justify-between mt-1">
                <p className="text-[11px] text-vault-muted">Be specific — generic titles get rejected</p>
                <p className={cn("text-[11px]", title.length >= 10 ? "text-vault-teal" : "text-vault-muted")}>
                  {title.length}/10+ chars
                </p>
              </div>
            </div>

            <div>
              <label className="field-label mb-2 block">
                Severity <span className="text-vault-teal">*</span>
                <span className="font-normal text-vault-muted ml-1.5">— AI will suggest severity, but your assessment matters</span>
              </label>
              <div className="space-y-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all",
                      severity === opt.value
                        ? opt.cls
                        : "border-vault-border bg-vault-elevated hover:border-vault-border-bright"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {severity === opt.value && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-vault-muted mt-1">{opt.desc}</p>
                    <p className="text-[11px] text-vault-muted/70 mt-0.5 italic">{opt.example}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">
                Description <span className="text-vault-teal">*</span>
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={5}
                placeholder="Describe the vulnerability in detail. Include: what it is, where you found it, and why it's a security issue..."
                className="vault-input mt-1.5 resize-none"
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Steps to reproduce ──────────────────────────────────── */}
        {step === "reproduce" && (
          <div className="space-y-5">
            <InfoBox icon={<Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}>
              Clear, numbered steps dramatically increase acceptance rates.
              Include specific URLs, request/response examples, and screenshots.
            </InfoBox>

            <div>
              <label className="field-label">
                Steps to reproduce <span className="text-vault-teal">*</span>
              </label>
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                rows={10}
                placeholder={`1. Log in as a regular user at https://app.example.com/login
2. Navigate to /api/v1/users?id=1
3. Modify the id parameter to id=2 in Burp Suite
4. Observe that user data for another account is returned
5. The response includes email, full_name, phone_number...`}
                className="vault-input mt-1.5 resize-none font-mono text-xs leading-relaxed"
              />
              <p className={cn("text-[11px] mt-1", steps.length >= 20 ? "text-vault-teal" : "text-vault-muted")}>
                {steps.length} chars (min 20) — more detail = higher acceptance rate
              </p>
            </div>

            {/* File uploads */}
            <div>
              <label className="field-label mb-2 block">
                Attachments <span className="font-normal text-vault-muted">— screenshots, PoC, videos (max 2MB each, 5 files)</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileAdd}
                multiple
                accept="image/*,video/mp4,application/pdf,text/plain"
                className="hidden"
              />

              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-vault-elevated rounded-lg border border-vault-border text-sm">
                      <Upload className="w-3.5 h-3.5 text-vault-muted shrink-0" />
                      <span className="flex-1 truncate text-vault-subtle">{file.name}</span>
                      <span className="text-[11px] text-vault-muted shrink-0">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-vault-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-vault-border rounded-xl p-6 text-center hover:border-vault-teal/40 hover:bg-vault-teal/5 transition-all group"
                >
                  <Upload className="w-5 h-5 text-vault-muted mx-auto mb-2 group-hover:text-vault-teal transition-colors" />
                  <p className="text-sm text-vault-muted group-hover:text-vault-subtle">
                    Click to upload screenshot or PoC
                  </p>
                  <p className="text-xs text-vault-muted mt-1">PNG, JPG, PDF, TXT, MP4 · Max 2MB</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Impact ──────────────────────────────────────────────── */}
        {step === "impact" && (
          <div className="space-y-5">
            <InfoBox icon={<AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />}>
              Impact analysis is the most overlooked part of a report. Triagers need to understand
              real-world consequences — not just "this is a security issue."
            </InfoBox>

            <div>
              <label className="field-label">Business impact</label>
              <textarea
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                rows={6}
                placeholder={`An attacker exploiting this vulnerability could:
- Access PII (name, email, phone) of all registered users (~50,000 accounts)
- Bypass authentication and impersonate any user
- Exfiltrate data that could be used for phishing campaigns

CVSS score estimate: 9.1 (Critical)
Attack vector: Network / Attack complexity: Low / Privileges: None`}
                className="vault-input mt-1.5 resize-none"
              />
            </div>

            <div className="vault-card p-4 border-vault-teal/20">
              <div className="flex gap-2.5">
                <Zap className="w-4 h-4 text-vault-teal shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">AI severity review</p>
                  <p className="text-xs text-vault-muted leading-relaxed">
                    After submission, our AI will independently assess severity and flag potential duplicates.
                    Your severity assessment + the AI suggestion will both be visible to the triager.
                    The human triager makes the final call.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ──────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-vault-teal" />
              <h2 className="font-medium">Review your report</h2>
            </div>

            <div className="space-y-3">
              <ReviewBlock label="Title"    value={title} />
              <ReviewBlock label="Severity" value={severity} capitalize />
              <ReviewBlock label="Description" value={desc} multiline />
              <ReviewBlock label="Steps to Reproduce" value={steps} multiline mono />
              {impact && <ReviewBlock label="Impact" value={impact} multiline />}
              {files.length > 0 && (
                <ReviewBlock label="Attachments" value={`${files.length} file${files.length !== 1 ? "s" : ""} attached`} />
              )}
            </div>

            <div className="bg-vault-teal/5 border border-vault-teal/20 rounded-xl p-4 text-xs text-vault-muted space-y-1.5">
              <p className="font-medium text-vault-teal flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> What happens next
              </p>
              <p>1. AI checks for exact and semantic duplicates within this program</p>
              <p>2. AI suggests a severity level with confidence score</p>
              <p>3. A triager reviews within the program's SLA</p>
              <p>4. You get notified by email when there's an update</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6 pt-5 border-t border-vault-border">
          {stepIdx > 0 ? (
            <button
              type="button"
              onClick={() => setStep(STEPS[stepIdx - 1].key)}
              className="btn-ghost flex-1"
            >
              Back
            </button>
          ) : (
            <Link href="/dashboard/researcher/programs" className="btn-ghost flex-1 text-center">
              Cancel
            </Link>
          )}

          {stepIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => canAdvance && setStep(STEPS[stepIdx + 1].key)}
              disabled={!canAdvance}
              className="btn-teal flex-1 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !canDetails}
              className="btn-teal flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {pending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : <><Bug className="w-4 h-4" /> Submit Report</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function InfoBox({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-blue-950/30 border border-blue-900/40 rounded-lg p-3.5">
      {icon}
      <p className="text-xs text-blue-200/70 leading-relaxed">{children}</p>
    </div>
  );
}

function ReviewBlock({
  label, value, multiline, mono, capitalize,
}: {
  label: string; value: string; multiline?: boolean; mono?: boolean; capitalize?: boolean;
}) {
  return (
    <div className="py-2.5 border-b border-vault-border/50 last:border-0">
      <p className="text-xs font-medium text-vault-muted mb-1.5">{label}</p>
      <p className={cn(
        "text-sm text-vault-text",
        multiline ? "whitespace-pre-wrap leading-relaxed line-clamp-3" : "",
        mono      ? "font-mono text-xs" : "",
        capitalize ? "capitalize" : ""
      )}>
        {value || <span className="italic text-vault-muted">Not provided</span>}
      </p>
    </div>
  );
}
