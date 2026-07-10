"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { toast }              from "sonner";
import { Loader2, Save, Globe } from "lucide-react";
import { updateUserSettings } from "@/app/actions/settings";
import { getGithubInstallationStatus, disconnectGithubApp } from "@/app/actions/github-app";
import { SectionCard }        from "@/components/settings/section-card";
import { IntegrationTile }    from "@/components/settings/integration-tile";
import { useSearchParams }    from "next/navigation";

/** Isolated in its own component + Suspense boundary because Next.js
 *  requires useSearchParams() to not block the rest of the page render. */
function GithubCallbackToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const githubParam = searchParams.get("github");
    if (githubParam === "connected") toast.success("GitHub App connected");
    if (githubParam === "pending") toast.info("Installation request sent — waiting on GitHub org approval");
    if (githubParam === "error") toast.error("Failed to connect the GitHub App — please try again");
  }, [searchParams]);

  return null;
}

// SVG icons for services not in lucide
function GitLabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.94 2a.43.43 0 01.58.28l2.44 7.49h8.1l2.44-7.49a.42.42 0 01.58-.28.41.41 0 01.27.42L17 9.67l2.44 7.51a.84.84 0 01-.79 1.21z"/>
    </svg>
  );
}

function JiraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 00-.84-.84zm-4.9 4.94c0 2.4 1.96 4.34 4.35 4.35h1.78v1.71c0 2.4 1.94 4.35 4.34 4.35V7.78a.84.84 0 00-.84-.84zM1.72 11.88c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35V12.72a.84.84 0 00-.84-.84z"/>
    </svg>
  );
}

export default function IntegrationsPage() {
  const [pending, start] = useTransition();

  // Jira config
  const [jiraUrl, setJiraUrl]     = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraConnected, setJiraConnected] = useState(false);

  // Slack
  const [slackWebhook, setSlackWebhook]   = useState("");
  const [slackConnected, setSlackConnected] = useState(false);

  // GitHub (real GitHub App installation)
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubLogin, setGithubLogin]         = useState("");
  const [githubLoading, setGithubLoading]     = useState(true);

  useEffect(() => {
    getGithubInstallationStatus()
      .then((status) => {
        setGithubConnected(status.connected);
        setGithubLogin(status.accountLogin ?? "");
      })
      .finally(() => setGithubLoading(false));
  }, []);

  function saveJira() {
    start(async () => {
      try {
        if (!jiraUrl || !jiraToken) throw new Error("URL and token are required");
        await updateUserSettings({ jira_url: jiraUrl, jira_token: jiraToken });
        setJiraConnected(true);
        toast.success("Jira connected");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function saveSlack() {
    start(async () => {
      try {
        if (!slackWebhook) throw new Error("Webhook URL required");
        await updateUserSettings({ slack_webhook: slackWebhook });
        setSlackConnected(true);
        toast.success("Slack connected");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  async function disconnectJira() {
    await updateUserSettings({ jira_url: null, jira_token: null });
    setJiraConnected(false);
    setJiraUrl(""); setJiraToken("");
  }

  async function disconnectSlack() {
    await updateUserSettings({ slack_webhook: null });
    setSlackConnected(false);
    setSlackWebhook("");
  }

  async function connectGithub() {
    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
    if (!appSlug) {
      toast.error("GitHub App isn't configured on this deployment (NEXT_PUBLIC_GITHUB_APP_SLUG missing).");
      return;
    }
    // Redirect to GitHub's install flow — it redirects back to
    // /api/github/install-callback, which persists the installation.
    window.location.href = `https://github.com/apps/${appSlug}/installations/new`;
  }

  async function disconnectGithub() {
    try {
      await disconnectGithubApp();
      setGithubConnected(false);
      setGithubLogin("");
      toast.success("GitHub App disconnected");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    }
  }

  return (
    <div className="space-y-5 animate-in">
      <Suspense fallback={null}>
        <GithubCallbackToast />
      </Suspense>
      <SectionCard title="Connected Integrations" description="Link external tools to enhance your workflow">
        <div>
          {/* GitHub */}
          <IntegrationTile
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/>
              </svg>
            }
            name="GitHub"
            description="Install the VAULTX GitHub App to scan private repositories"
            connected={githubConnected}
            connectedInfo={githubConnected ? `Connected to @${githubLogin}` : undefined}
            onConnect={connectGithub}
            onDisconnect={disconnectGithub}
            docsUrl="https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-github-marketplace-for-your-organizations"
          />
          {githubLoading && (
            <div className="px-3 pb-2 text-[11px] text-vault-muted flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking installation status…
            </div>
          )}

          {/* GitLab */}
          <IntegrationTile
            icon={<GitLabIcon />}
            name="GitLab"
            description="Connect GitLab for CI pipeline and MR integration"
            connected={false}
            onConnect={async () => { toast.info("GitLab OAuth — configure GITLAB_CLIENT_ID in .env"); }}
            docsUrl="https://docs.gitlab.com/ee/api/oauth2.html"
          />

          {/* Jira */}
          <IntegrationTile
            icon={<JiraIcon />}
            name="Jira"
            description="Create Jira issues automatically from vulnerability reports"
            connected={jiraConnected}
            connectedInfo={jiraConnected ? `Connected to ${jiraUrl}` : undefined}
            onDisconnect={disconnectJira}
            configSlot={
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium mb-1 text-vault-muted">Jira URL</label>
                  <input
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    placeholder="https://yourorg.atlassian.net"
                    className="vault-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-vault-muted">API Token</label>
                  <input
                    value={jiraToken}
                    onChange={(e) => setJiraToken(e.target.value)}
                    type="password"
                    placeholder="Your Jira API token"
                    className="vault-input w-full text-xs font-mono"
                  />
                </div>
                <button onClick={saveJira} disabled={pending} className="btn-teal text-xs flex items-center gap-1 disabled:opacity-40">
                  {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save & Connect
                </button>
              </div>
            }
          />

          {/* Slack */}
          <IntegrationTile
            icon={<Globe className="w-4 h-4" />}
            name="Slack"
            description="Post vulnerability alerts to a Slack channel"
            connected={slackConnected}
            connectedInfo={slackConnected ? "Webhook active" : undefined}
            onDisconnect={disconnectSlack}
            configSlot={
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium mb-1 text-vault-muted">Incoming Webhook URL</label>
                  <input
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="vault-input w-full font-mono text-xs"
                  />
                </div>
                <button onClick={saveSlack} disabled={pending} className="btn-teal text-xs flex items-center gap-1 disabled:opacity-40">
                  {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save & Connect
                </button>
              </div>
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
