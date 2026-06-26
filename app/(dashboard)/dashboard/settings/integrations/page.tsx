"use client";

import { useState, useTransition } from "react";
import { toast }              from "sonner";
import { Loader2, Save, Github, Slack, Globe } from "lucide-react";
import { updateUserSettings } from "@/app/actions/settings";
import { SectionCard }        from "@/components/settings/section-card";
import { IntegrationTile }    from "@/components/settings/integration-tile";

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

  // GitHub (OAuth — mock)
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubLogin, setGithubLogin]         = useState("");

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

  function connectGithub() {
    // In production: redirect to /api/auth/github
    toast.info("GitHub OAuth flow — configure GITHUB_CLIENT_ID in your .env");
    setGithubConnected(true);
    setGithubLogin("demo-user");
  }

  async function disconnectGithub() {
    await updateUserSettings({ github_token: null });
    setGithubConnected(false);
    setGithubLogin("");
    toast.success("GitHub disconnected");
  }

  return (
    <div className="space-y-5 animate-in">
      <SectionCard title="Connected Integrations" description="Link external tools to enhance your workflow">
        <div>
          {/* GitHub */}
          <IntegrationTile
            icon={<Github className="w-4 h-4" />}
            name="GitHub"
            description="Connect your GitHub account for repository scanning"
            connected={githubConnected}
            connectedInfo={githubConnected ? `Connected as @${githubLogin}` : undefined}
            onConnect={async () => { connectGithub(); }}
            onDisconnect={disconnectGithub}
            docsUrl="https://docs.github.com/en/apps/oauth-apps"
          />

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
