import Link from "next/link";
import { ShieldCheck, Key, Zap, ArrowLeft } from "lucide-react";

const ENDPOINTS = [
  {
    method: "GET", path: "/api/v1/submissions", scope: "read:submissions",
    desc: "List your own submissions.",
    params: "?limit= (max 100, default 20)  &status=",
  },
  {
    method: "POST", path: "/api/v1/submissions", scope: "write:submissions",
    desc: "Create a submission through the same dedup + AI validation pipeline as the dashboard form.",
    body: `{
  "program_id": "uuid",
  "title": "string (min 10 chars)",
  "description": "string",
  "steps_to_reproduce": "string",
  "impact": "string (optional)",
  "severity": "critical | high | medium | low | info"
}`,
  },
  {
    method: "GET", path: "/api/v1/programs", scope: "read:programs",
    desc: "List active, publicly-scoped bounty programs.",
    params: "?limit= (max 100, default 20)",
  },
  {
    method: "GET", path: "/api/v1/rewards", scope: "read:rewards",
    desc: "List rewards you've earned (researcher) or owe (org owner).",
    params: "?limit= (max 100, default 20)",
  },
  {
    method: "GET", path: "/api/v1/reports", scope: "read:reports",
    desc: "List PTaaS report metadata for engagements you're involved in. Use the signed PDF route for the full document.",
    params: "?limit= (max 100, default 20)",
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:  "text-emerald-400 bg-emerald-950/30 border-emerald-900/40",
  POST: "text-amber-400 bg-amber-950/30 border-amber-900/40",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-vault-bg text-vault-text">
      <nav className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-vault-border/50 backdrop-blur-sm bg-vault-bg/80 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-vault-teal" />
          </div>
          <span className="font-semibold tracking-tight">VAULTX API</span>
        </div>
        <Link href="/dashboard/settings/api-keys" className="text-sm text-vault-muted hover:text-vault-text transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Manage API keys
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-14 space-y-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Public API</h1>
          <p className="text-vault-muted">
            Programmatic access to VAULTX for CI/CD pipelines, scripts, and integrations.
            Every response is JSON. Rate limits and scopes are per API key.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-medium flex items-center gap-2"><Key className="w-4.5 h-4.5 text-vault-teal" /> Authentication</h2>
          <p className="text-sm text-vault-muted">
            Generate a key from Settings → API Keys, then send it as a Bearer token on every request:
          </p>
          <pre className="bg-vault-surface border border-vault-border rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`curl https://your-deployment.example.com/api/v1/submissions \\
  -H "Authorization: Bearer vx_..."`}
          </pre>
          <p className="text-xs text-vault-muted">
            Keys are shown once at creation — store them securely. Each key is scoped to specific
            permissions chosen when you create it; a request against an endpoint your key isn't
            scoped for returns <code className="font-mono bg-vault-elevated px-1 rounded">403</code>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium flex items-center gap-2"><Zap className="w-4.5 h-4.5 text-vault-teal" /> Rate limits</h2>
          <p className="text-sm text-vault-muted">
            100 requests/hour per key for read endpoints, 20 requests/hour for the submission-creation
            endpoint. Remaining quota is returned on every response via the{" "}
            <code className="font-mono bg-vault-elevated px-1 rounded">X-RateLimit-Remaining</code> header.
            Exceeding the limit returns <code className="font-mono bg-vault-elevated px-1 rounded">429</code>.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-medium">Endpoints</h2>
          {ENDPOINTS.map((e) => (
            <div key={`${e.method}-${e.path}`} className="border border-vault-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${METHOD_COLOR[e.method]}`}>
                  {e.method}
                </span>
                <code className="text-sm font-mono">{e.path}</code>
                <span className="text-[10px] text-vault-muted bg-vault-elevated px-2 py-0.5 rounded border border-vault-border">
                  scope: {e.scope}
                </span>
              </div>
              <p className="text-sm text-vault-muted">{e.desc}</p>
              {e.params && (
                <div className="text-xs font-mono text-vault-muted">{e.params}</div>
              )}
              {e.body && (
                <pre className="bg-vault-surface border border-vault-border rounded-lg p-3 text-xs font-mono overflow-x-auto">{e.body}</pre>
              )}
            </div>
          ))}
        </section>

        <section className="text-xs text-vault-muted border-t border-vault-border pt-6">
          Need a scope that doesn't exist yet, or hit a limit that's too tight for a legitimate
          use case? Reach out — this API surface grows based on real integration needs, not
          speculative coverage.
        </section>
      </div>
    </div>
  );
}
