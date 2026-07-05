-- ============================================================
-- VAULTX — Migration 016: GitHub App Integration (Private Repos)
-- ============================================================
-- Replaces the mock "GitHub OAuth" toggle in Settings → Integrations
-- (which faked a connection with a hardcoded "demo-user" and never
-- called GitHub at all) with a real GitHub App installation record.
--
-- One org can have one active installation. Re-installing (e.g. after
-- changing which repos are granted) upserts this row rather than
-- creating duplicates.

create table github_installations (
  id                     uuid          primary key default uuid_generate_v4(),
  org_id                 uuid          not null references organizations(id) on delete cascade,
  installation_id        bigint        not null unique,   -- GitHub's installation id
  account_login          text          not null,          -- the GitHub user/org that installed the app
  account_type           text          not null,          -- "User" | "Organization"
  repository_selection   text          not null,          -- "all" | "selected"
  connected_by           uuid          not null references profiles(id),
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now(),

  constraint github_installations_org_unique unique (org_id)
);

create index github_installations_account_login_idx on github_installations(account_login);

create trigger trg_github_installations_updated_at
  before update on github_installations
  for each row execute function public.handle_updated_at();

alter table github_installations enable row level security;

create policy "Org owners manage their own GitHub installation"
  on github_installations for all
  using (org_id in (select id from organizations where owner_id = auth.uid()))
  with check (org_id in (select id from organizations where owner_id = auth.uid()));
