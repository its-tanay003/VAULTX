"use client";

import { useState, useTransition }  from "react";
import { useRouter }                 from "next/navigation";
import { createProgram }             from "@/app/actions/programs";
import { toast }                     from "sonner";
import {
  Target, ChevronLeft, Loader2, Globe, Lock,
  Plus, X, Info, DollarSign, CheckCircle2,
} from "lucide-react";
import Link    from "next/link";
import { cn, slugify } from "@/lib/utils";

type ProgramType = "bug_bounty" | "vdp";
type Step        = "basics" | "scope" | "rewards" | "review";

const STEPS: { key: Step; label: string; description: string }[] = [
  { key: "basics",  label: "Basics",  description: "Name, type, and description"    },
  { key: "scope",   label: "Scope",   description: "What's in and out of scope"     },
  { key: "rewards", label: "Rewards", description: "Bounty tiers and response time" },
  { key: "review",  label: "Review",  description: "Confirm and launch"             },
];

export default function NewProgramPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>("basics");
  const [pending, start]    = useTransition();

  // Form state
  const [name,        setName]        = useState("");
  const [type,        setType]        = useState<ProgramType>("bug_bounty");
  const [description, setDescription] = useState("");
  const [rules,       setRules]       = useState("");
  const [scopeIn,     setScopeIn]     = useState<string[]>([""]);
  const [scopeOut,    setScopeOut]    = useState<string[]>([""]);
  const [minReward,   setMinReward]   = useState("");
  const [maxReward,   setMaxReward]   = useState("");
  const [isPublic,    setIsPublic]    = useState(true);
  const [launchNow,   setLaunchNow]   = useState(false);

  const stepIdx      = STEPS.findIndex((s) => s.key === step);
  const slugPreview  = slugify(name);

  /* ─── Scope list helpers ──────────────────────────────────────────────── */
  function addScope(list: string[], set: (v: string[]) => void) {
    set([...list, ""]);
  }
  function updateScope(list: string[], set: (v: string[]) => void, idx: number, val: string) {
    const next = [...list]; next[idx] = val; set(next);
  }
  function removeScope(list: string[], set: (v: string[]) => void, idx: number) {
    set(list.filter((_, i) => i !== idx));
  }

  /* ─── Submit ──────────────────────────────────────────────────────────── */
  function handleSubmit() {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("name",        name);
        fd.set("type",        type);
        fd.set("description", description);
        fd.set("rules",       rules);
        fd.set("scope_in",    scopeIn.filter(Boolean).join("\n"));
        fd.set("scope_out",   scopeOut.filter(Boolean).join("\n"));
        fd.set("min_reward",  minReward);
        fd.set("max_reward",  maxReward);
        fd.set("is_public",   String(isPublic));
        fd.set("status",      launchNow ? "active" : "draft");
        await createProgram(fd);
        toast.success(launchNow ? "Program launched! 🚀" : "Program saved as draft");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to create program");
      }
    });
  }

  /* ─── Validation ──────────────────────────────────────────────────────── */
  const basicsValid  = name.trim().length > 2 && description.trim().length > 10;
  const scopeValid   = scopeIn.some((s) => s.trim());
  const canAdvance   = step === "basics" ? basicsValid : step === "scope" ? scopeValid : true;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/org/programs" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">New Program</h1>
          <p className="text-sm text-vault-muted">Create a bug bounty or VDP program</p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="vault-card p-4">
        <div className="flex items-center">
          {STEPS.map(({ key, label }, i) => (
            <div key={key} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < stepIdx && setStep(key)}
                className={cn(
                  "flex items-center gap-2 shrink-0 transition-all",
                  i < stepIdx  ? "cursor-pointer" : "cursor-default"
                )}
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
                <div className={cn(
                  "h-px flex-1 mx-2 transition-colors",
                  i < stepIdx ? "bg-vault-teal" : "bg-vault-border"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="vault-card p-6">

        {/* ── Step: Basics ───────────────────────────────────────────────── */}
        {step === "basics" && (
          <div className="space-y-5">
            <SectionHeader icon={<Target className="w-4 h-4" />} title="Program basics" />

            {/* Type selector */}
            <div>
              <label className="field-label">Program type</label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                {([ ["bug_bounty", "Bug Bounty", "Pay researchers for valid vulnerabilities"],
                    ["vdp",        "VDP",         "Vulnerability disclosure, no monetary rewards"],
                ] as [ProgramType, string, string][]).map(([val, label, desc]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setType(val)}
                    className={cn(
                      "text-left p-3.5 rounded-xl border transition-all",
                      type === val
                        ? "border-vault-teal bg-vault-teal/5"
                        : "border-vault-border bg-vault-elevated hover:border-vault-border-bright"
                    )}
                  >
                    <div className="text-sm font-medium mb-1">{label}</div>
                    <div className="text-xs text-vault-muted">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="field-label">Program name <Req /></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Web App Security Program"
                className="vault-input mt-1.5"
              />
              {name && (
                <p className="mt-1 text-[11px] text-vault-muted font-mono">
                  slug: <span className="text-vault-subtle">{slugPreview}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="field-label">Description <Req /></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your program, what you're looking for, and what researchers can expect..."
                rows={4}
                className="vault-input mt-1.5 resize-none"
              />
              <p className="text-[11px] text-vault-muted mt-1">{description.length} chars (min 10)</p>
            </div>

            {/* Rules */}
            <div>
              <label className="field-label">Program rules</label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Safe harbor policy, disclosure timeline, testing guidelines, prohibited actions..."
                rows={5}
                className="vault-input mt-1.5 resize-none"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="field-label">Visibility</label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                {([
                  [true,  <Globe key="g" className="w-4 h-4" />, "Public",  "Listed in researcher directory"],
                  [false, <Lock  key="l" className="w-4 h-4" />, "Private", "Invite-only, not publicly listed"],
                ] as [boolean, React.ReactNode, string, string][]).map(([val, icon, label, desc]) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setIsPublic(val)}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all flex items-start gap-2.5",
                      isPublic === val
                        ? "border-vault-teal bg-vault-teal/5"
                        : "border-vault-border bg-vault-elevated hover:border-vault-border-bright"
                    )}
                  >
                    <span className="text-vault-teal mt-0.5">{icon}</span>
                    <div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-vault-muted">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Scope ─────────────────────────────────────────────────── */}
        {step === "scope" && (
          <div className="space-y-6">
            <SectionHeader icon={<Target className="w-4 h-4" />} title="Define scope" />

            <InfoBox>
              Be specific. Clear scope reduces invalid reports dramatically.
              Use URLs, IP ranges, app names, or wildcard patterns (e.g. <code className="font-mono">*.acme.com</code>).
            </InfoBox>

            <ScopeList
              label="In scope"
              required
              placeholder="e.g. https://app.acme.com"
              hint="Assets researchers ARE allowed to test"
              items={scopeIn}
              onAdd={() => addScope(scopeIn, setScopeIn)}
              onChange={(i, v) => updateScope(scopeIn, setScopeIn, i, v)}
              onRemove={(i) => removeScope(scopeIn, setScopeIn, i)}
              accentColor="teal"
            />

            <ScopeList
              label="Out of scope"
              placeholder="e.g. https://staging.acme.com"
              hint="Assets explicitly excluded from testing"
              items={scopeOut}
              onAdd={() => addScope(scopeOut, setScopeOut)}
              onChange={(i, v) => updateScope(scopeOut, setScopeOut, i, v)}
              onRemove={(i) => removeScope(scopeOut, setScopeOut, i)}
              accentColor="red"
            />
          </div>
        )}

        {/* ── Step: Rewards ───────────────────────────────────────────────── */}
        {step === "rewards" && (
          <div className="space-y-5">
            <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Rewards & SLA" />

            {type === "vdp" ? (
              <InfoBox>
                VDP programs don&apos;t offer monetary rewards. Researchers contribute for recognition,
                improved security, and leaderboard reputation.
              </InfoBox>
            ) : (
              <>
                <InfoBox>
                  Set a range to give researchers an expectation. Actual reward is set per-submission
                  and requires manual human approval — AI cannot approve payouts.
                </InfoBox>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Minimum reward (USD)</label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
                      <input
                        type="number"
                        min="0"
                        value={minReward}
                        onChange={(e) => setMinReward(e.target.value)}
                        placeholder="50"
                        className="vault-input pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Maximum reward (USD)</label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
                      <input
                        type="number"
                        min="0"
                        value={maxReward}
                        onChange={(e) => setMaxReward(e.target.value)}
                        placeholder="10000"
                        className="vault-input pl-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick tier presets */}
                <div>
                  <label className="field-label mb-2 block">Quick presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Startup",    min: 50,   max: 1000  },
                      { label: "SMB",        min: 100,  max: 5000  },
                      { label: "Enterprise", min: 500,  max: 20000 },
                      { label: "Top-tier",   min: 1000, max: 50000 },
                    ].map(({ label, min, max }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { setMinReward(String(min)); setMaxReward(String(max)); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-vault-border bg-vault-elevated hover:border-vault-teal/40 hover:text-vault-teal transition-all"
                      >
                        {label} (${min}–${max.toLocaleString()})
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step: Review ────────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-5">
            <SectionHeader icon={<CheckCircle2 className="w-4 h-4" />} title="Review & launch" />

            <div className="space-y-3">
              <ReviewRow label="Name"        value={name} />
              <ReviewRow label="Type"        value={type.replace("_", " ")} capitalize />
              <ReviewRow label="Visibility"  value={isPublic ? "Public" : "Private"} />
              {type === "bug_bounty" && (minReward || maxReward) && (
                <ReviewRow
                  label="Reward range"
                  value={`$${Number(minReward||0).toLocaleString()} – $${Number(maxReward||0).toLocaleString()}`}
                />
              )}
              <ReviewRow label="In-scope assets"  value={`${scopeIn.filter(Boolean).length} defined`} />
              <ReviewRow label="Out-of-scope"      value={`${scopeOut.filter(Boolean).length} defined`} />
            </div>

            {/* Launch toggle */}
            <div className={cn(
              "p-4 rounded-xl border transition-all cursor-pointer",
              launchNow
                ? "border-vault-teal bg-vault-teal/5"
                : "border-vault-border bg-vault-elevated"
            )}
              onClick={() => setLaunchNow(!launchNow)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Launch now</span>
                <div className={cn(
                  "w-9 h-5 rounded-full transition-colors relative",
                  launchNow ? "bg-vault-teal" : "bg-vault-border"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                    launchNow ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </div>
              </div>
              <p className="text-xs text-vault-muted">
                {launchNow
                  ? "Program goes live immediately and will be visible to researchers"
                  : "Save as draft — you can launch anytime from the program detail page"}
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
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
            <Link href="/dashboard/org/programs" className="btn-ghost flex-1 text-center">
              Cancel
            </Link>
          )}

          {stepIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(STEPS[stepIdx + 1].key)}
              disabled={!canAdvance}
              className="btn-teal flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !basicsValid}
              className="btn-teal flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {pending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                : launchNow ? "Launch Program 🚀" : "Save as Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function Req() {
  return <span className="text-vault-teal ml-0.5">*</span>;
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-vault-teal">{icon}</span>
      <h2 className="font-medium">{title}</h2>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-blue-950/30 border border-blue-900/40 rounded-lg p-3.5">
      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-200/70 leading-relaxed">{children}</p>
    </div>
  );
}

function ScopeList({
  label, required, placeholder, hint, items, onAdd, onChange, onRemove, accentColor,
}: {
  label: string; required?: boolean; placeholder: string; hint: string;
  items: string[]; onAdd: () => void;
  onChange: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  accentColor: "teal" | "red";
}) {
  const dotCls = accentColor === "teal" ? "bg-vault-teal" : "bg-red-400";
  return (
    <div>
      <label className="field-label">
        {label} {required && <Req />}
        <span className="font-normal text-vault-muted ml-1">— {hint}</span>
      </label>
      <div className="mt-1.5 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
            <input
              value={item}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={placeholder}
              className="vault-input flex-1"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-vault-muted hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs text-vault-muted hover:text-vault-teal transition-colors mt-1"
        >
          <Plus className="w-3 h-3" /> Add {label.toLowerCase()} asset
        </button>
      </div>
    </div>
  );
}

function ReviewRow({
  label, value, capitalize,
}: {
  label: string; value: string; capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-vault-border/50 text-sm">
      <span className="text-vault-muted">{label}</span>
      <span className={cn("text-vault-text font-medium text-right max-w-[60%]", capitalize && "capitalize")}>
        {value}
      </span>
    </div>
  );
}
