"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { toast }                from "sonner";
import { Loader2, Save, UserMinus, UserPlus, Mail, Shield, Globe, Building2, Webhook } from "lucide-react";
import { updateOrgProfile, updateOrgSettings, inviteTeamMember, removeTeamMember } from "@/app/actions/settings";
import { createClient }         from "@/lib/supabase/client";
import { SectionCard, FieldRow, SettingsToggle } from "@/components/settings/section-card";
import { useRouter }            from "next/navigation";

interface TeamMember {
  id:       string;
  email:    string;
  full_name: string | null;
  role:     string;
}

export default function OrganizationSettingsPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [pending, start]   = useTransition();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId]   = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Org profile fields
  const [orgName, setOrgName]         = useState("");
  const [orgSlug, setOrgSlug]         = useState("");
  const [orgWebsite, setOrgWebsite]   = useState("");
  const [orgDesc, setOrgDesc]         = useState("");
  const [orgIndustry, setOrgIndustry] = useState("");

  // Security policy
  const [require2FA, setRequire2FA]   = useState(false);
  const [ssoEnabled, setSsoEnabled]   = useState(false);
  const [allowedDomains, setAllowedDomains] = useState("");

  // Webhooks
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");

  // Jira
  const [jiraUrl, setJiraUrl]         = useState("");
  const [jiraToken, setJiraToken]     = useState("");
  const [jiraProject, setJiraProject] = useState("");

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id || !["org", "triager", "admin"].includes(profile.role)) {
        router.replace("/dashboard/settings/profile");
        return;
      }
      setOrgId(profile.org_id);

      // Load org
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.org_id)
        .single();
      if (org) {
        setOrgName(org.name ?? "");
        setOrgSlug(org.slug ?? "");
        setOrgWebsite(org.website ?? "");
        setOrgDesc(org.description ?? "");
        setOrgIndustry(org.industry ?? "");
      }

      // Load team
      const { data: team } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("org_id", profile.org_id);
      if (team) setMembers(team as TeamMember[]);

      setLoading(false);
    }
    load();
  }, [router, supabase]);

  function handleSaveProfile() {
    if (!orgId) return;
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("name",        orgName);
        fd.set("slug",        orgSlug);
        fd.set("website",     orgWebsite);
        fd.set("description", orgDesc);
        fd.set("industry",    orgIndustry);
        await updateOrgProfile(fd);
        toast.success("Organization profile updated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleSaveSecurity() {
    if (!orgId) return;
    start(async () => {
      try {
        await updateOrgSettings(orgId, {
          require_2fa:     require2FA,
          sso_enabled:     ssoEnabled,
          allowed_domains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean),
        });
        toast.success("Security policies updated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleSaveIntegrations() {
    if (!orgId) return;
    start(async () => {
      try {
        await updateOrgSettings(orgId, {
          webhook_url:     webhookUrl || null,
          slack_webhook:   slackWebhook || null,
          jira_url:        jiraUrl || null,
          jira_token:      jiraToken || null,
          jira_project_key: jiraProject || null,
        });
        toast.success("Integrations updated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleInvite() {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("email", inviteEmail);
        const result = await inviteTeamMember(fd);
        toast.success(result.message);
        setInviteEmail("");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  async function handleRemove(memberId: string) {
    try {
      await removeTeamMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-in">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Org Profile */}
      <SectionCard title="Organization Profile" description="Public information about your organization">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-vault-muted">Organization name</label>
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="vault-input w-full" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-vault-muted">Slug</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-vault-muted">vaultx.io/</span>
                <input
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="vault-input w-full pl-20"
                  placeholder="acme"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
              <input value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} className="vault-input pl-8 w-full" placeholder="https://acme.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Description</label>
            <textarea value={orgDesc} onChange={(e) => setOrgDesc(e.target.value)} rows={2} className="vault-input resize-none w-full" placeholder="Brief description…" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Industry</label>
            <select value={orgIndustry} onChange={(e) => setOrgIndustry(e.target.value)} aria-label="Industry" className="vault-input w-full">
              <option value="">Select industry…</option>
              {["Fintech", "Healthcare", "E-commerce", "SaaS", "Government", "Web3 / Crypto", "Defense", "Other"].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSaveProfile} disabled={pending} className="btn-teal flex items-center gap-2 disabled:opacity-40">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save profile</>}
          </button>
        </div>
      </SectionCard>

      {/* Team */}
      <SectionCard title="Team Members" description="Manage who has access to your organization">
        <div className="space-y-4">
          <div className="divide-y divide-vault-border/50">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center text-vault-teal text-xs font-medium shrink-0">
                  {(m.full_name || m.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.full_name || m.email}</p>
                  <p className="text-xs text-vault-muted">{m.email}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-vault-elevated border border-vault-border text-vault-muted capitalize">
                  {m.role}
                </span>
                <button
                  onClick={() => handleRemove(m.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-vault-muted hover:text-red-400 transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Invite */}
          <div className="pt-3 border-t border-vault-border flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="vault-input pl-8 w-full"
              />
            </div>
            <button onClick={handleInvite} disabled={pending || !inviteEmail} className="btn-teal flex items-center gap-1.5 disabled:opacity-40">
              <UserPlus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Security Policies */}
      <SectionCard title="Security Policies" description="Enforce security standards across your organization">
        <div>
          <FieldRow label="SSO / SAML" description="Enable single sign-on for your organization">
            <SettingsToggle checked={ssoEnabled} onChange={setSsoEnabled} />
          </FieldRow>
          <div className="pt-3">
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">
              Allowed email domains <span className="font-normal">(comma-separated)</span>
            </label>
            <input
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              placeholder="company.com, subsidiary.com"
              className="vault-input w-full"
            />
          </div>
          <button onClick={handleSaveSecurity} disabled={pending} className="btn-teal mt-4 flex items-center gap-2 disabled:opacity-40">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Shield className="w-4 h-4" /> Save policies</>}
          </button>
        </div>
      </SectionCard>

      {/* Integrations */}
      <SectionCard title="Organization Integrations" description="Connect tools used across your security team">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveIntegrations(); }} className="space-y-4">
          <div>
            <label className="flex text-xs font-medium mb-1.5 text-vault-muted items-center gap-1">
              <Webhook className="w-3 h-3" /> Webhook URL
            </label>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://yourserver.com/webhook" className="vault-input w-full font-mono text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Slack Webhook</label>
            <input value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="vault-input w-full font-mono text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-vault-muted">Jira URL</label>
              <input value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://yourorg.atlassian.net" autoComplete="off" className="vault-input w-full text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-vault-muted">Jira Project Key</label>
              <input value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} placeholder="SEC" autoComplete="off" className="vault-input w-full text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Jira API Token</label>
            <input value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} type="password" placeholder="Your Jira API token" autoComplete="current-password" className="vault-input w-full font-mono text-xs" />
          </div>
          <button type="submit" disabled={pending} className="btn-teal flex items-center gap-2 disabled:opacity-40">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save integrations</>}
          </button>
        </form>
      </SectionCard>

      {/* Billing */}
      <SectionCard title="Billing & Plan" description="Current subscription and usage">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize">{orgName || "Free"} Plan</span>
            </div>
            <p className="text-xs text-vault-muted mt-1">Manage plans, view invoices, and track resource limits</p>
          </div>
          <Link
            href="/dashboard/org/billing"
            className="px-3 py-1.5 text-xs rounded-lg border border-vault-border hover:bg-vault-elevated/50 transition-colors"
          >
            Manage Billing & Usage →
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
