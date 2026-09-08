-- =============================================================================
-- VAULTX: 037_capability_registry.sql
-- AI-Native Website Copilot: Capability Registry & Role Permissions
-- =============================================================================

-- Table: capability_registry
CREATE TABLE IF NOT EXISTS public.capability_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  route_pattern TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('navigation', 'read_action', 'write_action', 'destructive_action')),
  min_role user_rbac_role NOT NULL DEFAULT 'researcher'::user_rbac_role,
  requires_org_scope BOOLEAN NOT NULL DEFAULT false,
  requires_confirmation BOOLEAN NOT NULL DEFAULT false,
  available_offline BOOLEAN NOT NULL DEFAULT false,
  offline_behavior TEXT CHECK (offline_behavior IN ('read_cached', 'queue_for_sync', 'unavailable')),
  tool_schema JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: agent_tool_permissions
CREATE TABLE IF NOT EXISTS public.agent_tool_permissions (
  role user_rbac_role NOT NULL,
  capability_key TEXT NOT NULL REFERENCES public.capability_registry(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role, capability_key)
);

-- Enable RLS
ALTER TABLE public.capability_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can read capability registry" ON public.capability_registry;
CREATE POLICY "Anyone can read capability registry"
  ON public.capability_registry FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can read agent tool permissions" ON public.agent_tool_permissions;
CREATE POLICY "Anyone can read agent tool permissions"
  ON public.agent_tool_permissions FOR SELECT
  USING (true);

-- Initial Seed Data for Routes and Actions
INSERT INTO public.capability_registry (key, label, description, route_pattern, kind, min_role, requires_org_scope, requires_confirmation, available_offline, offline_behavior, tool_schema)
VALUES
  -- Navigation Capabilities — Core
  ('nav.dashboard_overview', 'Dashboard Overview', 'Main entry point showing overview metrics and activity.', '/dashboard', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.notifications', 'Notifications Feed', 'View real-time security alerts and system notices.', '/dashboard/notifications', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),

  -- Navigation Capabilities — Researcher
  ('nav.researcher_submissions', 'Researcher Submissions', 'View and manage all bug bounty submissions made by the researcher.', '/dashboard/researcher/submissions', 'navigation', 'researcher'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.researcher_submission_detail', 'Submission Details', 'View vulnerability report timeline, triager messages, and reward status.', '/dashboard/researcher/submissions/[id]', 'navigation', 'researcher'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.researcher_programs', 'Explore Bug Bounty Programs', 'Browse active public and private bug bounty programs.', '/dashboard/researcher/programs', 'navigation', 'researcher'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.researcher_program_detail', 'Program Scope & Policy', 'Read detailed program rules and in-scope assets.', '/dashboard/researcher/programs/[id]', 'navigation', 'researcher'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.researcher_earnings', 'Researcher Earnings & Payouts', 'View bounty payout history and Stripe Connect balance.', '/dashboard/researcher/earnings', 'navigation', 'researcher'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.researcher_leaderboard', 'Researcher Leaderboard', 'Global hacker rankings and monthly achievements.', '/dashboard/researcher/leaderboard', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.researcher_rewards', 'Reward Disbursals', 'Track rewarded findings and transaction hashes.', '/dashboard/researcher/rewards', 'navigation', 'researcher'::user_rbac_role, false, false, true, 'read_cached', NULL),

  -- Navigation Capabilities — Organization
  ('nav.org_dashboard', 'Organization Dashboard', 'Organization vulnerability overview and program management.', '/dashboard/org', 'navigation', 'developer'::user_rbac_role, true, false, true, 'read_cached', NULL),
  ('nav.org_programs', 'Manage Security Programs', 'Configure Bug Bounty and Vulnerability Disclosure policies.', '/dashboard/org/programs', 'navigation', 'maintainer'::user_rbac_role, true, false, true, 'read_cached', NULL),
  ('nav.org_triage', 'Triage Queue', 'Review incoming vulnerability reports and assign severity.', '/dashboard/org/triage', 'navigation', 'triager'::user_rbac_role, true, false, false, 'unavailable', NULL),
  ('nav.org_submissions', 'Organization Reports', 'Filter and review all submissions received by the organization.', '/dashboard/org/submissions', 'navigation', 'developer'::user_rbac_role, true, false, true, 'read_cached', NULL),
  ('nav.org_submission_detail', 'Organization Report Detail', 'View submission validation and award bounty.', '/dashboard/org/submissions/[id]', 'navigation', 'triager'::user_rbac_role, true, false, false, 'unavailable', NULL),
  ('nav.org_team', 'Team & Permissions', 'Manage organization members and assign roles.', '/dashboard/org/team', 'navigation', 'org_owner'::user_rbac_role, true, false, false, 'unavailable', NULL),
  ('nav.org_billing', 'Billing & Subscription', 'Manage subscription tier, add-ons, and payment method.', '/dashboard/org/billing', 'navigation', 'org_owner'::user_rbac_role, true, false, false, 'unavailable', NULL),
  ('nav.org_payouts', 'Payout Account Settings', 'Configure Stripe Connect treasury and disbursement accounts.', '/dashboard/org/payouts', 'navigation', 'org_owner'::user_rbac_role, true, false, false, 'unavailable', NULL),
  ('nav.org_reports', 'Security Reports Builder', 'Generate executive vulnerability trends reporting.', '/dashboard/org/reports', 'navigation', 'developer'::user_rbac_role, true, false, true, 'read_cached', NULL),

  -- Navigation Capabilities — Products
  ('nav.ai_red_team', 'AI Red Team', 'Autonomous adversarial LLM security scans and target management.', '/dashboard/ai-red-team', 'navigation', 'maintainer'::user_rbac_role, true, false, true, 'read_cached', NULL),
  ('nav.code_quality', 'Code Quality & Scans', 'Static analysis, SAST, and Web3 smart contract security scanning.', '/dashboard/code-quality', 'navigation', 'developer'::user_rbac_role, true, false, true, 'read_cached', NULL),
  ('nav.ptaas', 'PTaaS Engagements', 'Pentest-as-a-Service engagements, live tester collaboration, and findings.', '/dashboard/ptaas', 'navigation', 'developer'::user_rbac_role, true, false, true, 'read_cached', NULL),
  ('nav.ctf', 'CTF Competitions', 'Capture-the-Flag challenges, team scoreboards, and flag submissions.', '/dashboard/ctf', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.contests', 'Audit Contests', 'Time-boxed competitive smart contract security contests.', '/dashboard/contests', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.workspaces', 'Collaborative Workspaces', 'Multi-user shared security review environments.', '/dashboard/workspaces', 'navigation', 'developer'::user_rbac_role, true, false, true, 'read_cached', NULL),

  -- Navigation Capabilities — Settings
  ('nav.settings', 'Platform Settings', 'Main platform settings overview.', '/dashboard/settings', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.settings_profile', 'Profile Settings', 'Manage avatar, bio, and public profile.', '/dashboard/settings/profile', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.settings_security', 'Account Security & 2FA', 'Configure password, 2FA, and active sessions.', '/dashboard/settings/security', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.settings_notifications', 'Notification Preferences', 'Configure email and push notification alerts.', '/dashboard/settings/notifications', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.settings_privacy', 'Privacy & AI Controls', 'Manage AI Copilot Assistant mode and tracking.', '/dashboard/settings/privacy', 'navigation', 'guest'::user_rbac_role, false, false, true, 'read_cached', NULL),
  ('nav.settings_api_keys', 'API Keys', 'Create and revoke personal API tokens.', '/dashboard/settings/api-keys', 'navigation', 'developer'::user_rbac_role, false, false, false, 'unavailable', NULL),
  ('nav.settings_integrations', 'Connected Integrations', 'Manage GitHub, Slack, Discord, and webhook integrations.', '/dashboard/settings/integrations', 'navigation', 'maintainer'::user_rbac_role, true, false, false, 'unavailable', NULL),
  ('nav.settings_danger', 'Danger Zone', 'Account deletion and data export requests.', '/dashboard/settings/danger', 'navigation', 'guest'::user_rbac_role, false, true, false, 'unavailable', NULL),

  -- Action Capabilities
  ('action.trigger_code_scan', 'Trigger Code Scan', 'Run static security analysis and SAST against a connected repository.', NULL, 'write_action', 'developer'::user_rbac_role, true, true, false, 'queue_for_sync', '{"type": "object", "properties": {"repoId": {"type": "string"}}, "required": ["repoId"]}'::jsonb),
  ('action.trigger_web3_audit', 'Trigger Web3 Audit', 'Run automated Solidity and smart contract security audit.', NULL, 'write_action', 'developer'::user_rbac_role, true, true, false, 'queue_for_sync', '{"type": "object", "properties": {"repoId": {"type": "string"}}, "required": ["repoId"]}'::jsonb),
  ('action.generate_ptaas_report', 'Generate PTaaS Report', 'Generate signed executive and technical PDF pentest report.', NULL, 'read_action', 'triager'::user_rbac_role, true, true, false, 'unavailable', '{"type": "object", "properties": {"engagementId": {"type": "string"}}, "required": ["engagementId"]}'::jsonb),
  ('action.trigger_red_team_scan', 'Trigger Red Team Scan', 'Launch autonomous AI adversarial scan against an approved target.', NULL, 'write_action', 'maintainer'::user_rbac_role, true, true, false, 'queue_for_sync', '{"type": "object", "properties": {"targetId": {"type": "string"}}, "required": ["targetId"]}'::jsonb),
  ('action.request_more_info', 'Request More Information', 'Send a structured clarification request to the researcher.', NULL, 'write_action', 'triager'::user_rbac_role, true, true, false, 'queue_for_sync', '{"type": "object", "properties": {"submissionId": {"type": "string"}, "question": {"type": "string"}}, "required": ["submissionId", "question"]}'::jsonb),
  ('action.toggle_setting', 'Toggle User Setting', 'Update non-critical UI preferences or notification settings.', NULL, 'write_action', 'guest'::user_rbac_role, false, true, true, 'queue_for_sync', '{"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}'::jsonb),
  ('action.draft_ctf_challenge', 'Draft CTF Challenge', 'Create a new draft CTF challenge for competition organizers.', NULL, 'write_action', 'maintainer'::user_rbac_role, true, true, false, 'queue_for_sync', '{"type": "object", "properties": {"competitionId": {"type": "string"}, "title": {"type": "string"}, "category": {"type": "string"}, "difficulty": {"type": "string"}, "flag": {"type": "string"}}, "required": ["competitionId", "title", "category", "difficulty", "flag"]}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_pattern = EXCLUDED.route_pattern,
  kind = EXCLUDED.kind,
  min_role = EXCLUDED.min_role,
  requires_org_scope = EXCLUDED.requires_org_scope,
  requires_confirmation = EXCLUDED.requires_confirmation,
  available_offline = EXCLUDED.available_offline,
  offline_behavior = EXCLUDED.offline_behavior,
  tool_schema = EXCLUDED.tool_schema;
