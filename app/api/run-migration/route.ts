import { NextResponse } from "next/server";

// ONE-TIME MIGRATION RUNNER — DELETE AFTER USE
// Runs 012_settings.sql statements via Supabase pg-meta API
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== "run012settings") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Execute SQL via pg-meta (Supabase internal Studio API)
  async function runSQL(sql: string) {
    const res = await fetch(`${supabaseUrl}/pg-meta/v1/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  }

  const migrationSQL = `
-- ── User Settings ─────────────────────────────────────────────
create table if not exists user_settings (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  theme               text        not null default 'dark' check (theme in ('dark', 'light', 'system')),
  language            text        not null default 'en',
  timezone            text        not null default 'UTC',
  two_fa_enabled      boolean     not null default false,
  two_fa_secret       text,
  active_sessions     jsonb       not null default '[]'::jsonb,
  last_password_changed_at timestamptz,
  api_keys            jsonb       not null default '[]'::jsonb,
  linked_accounts     jsonb       not null default '{}'::jsonb,
  data_visibility     text        not null default 'public' check (data_visibility in ('public', 'org_only', 'private')),
  hide_from_leaderboard boolean   not null default false,
  show_activity       boolean     not null default true,
  marketing_emails    boolean     not null default true,
  security_alerts     boolean     not null default true,
  weekly_digest       boolean     not null default false,
  slack_webhook_url   text,
  jira_url            text,
  jira_token          text,
  slack_webhook       text,
  github_token        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists org_settings (
  org_id              uuid        primary key references organizations(id) on delete cascade,
  require_2fa         boolean     not null default false,
  sso_enabled         boolean     not null default false,
  sso_provider        text        check (sso_provider in ('google', 'azure', 'okta', 'saml')),
  sso_config          jsonb       not null default '{}'::jsonb,
  allowed_domains     text[]      not null default '{}',
  webhook_url         text,
  webhook_secret      text,
  webhook_events      text[]      not null default '{"submission.new","submission.accepted","reward.paid"}',
  slack_webhook       text,
  jira_url            text,
  jira_token          text,
  jira_project_key    text,
  default_payout_currency text    not null default 'USD',
  minimum_payout      integer     not null default 50,
  plan                text        not null default 'starter' check (plan in ('starter', 'growth', 'enterprise')),
  seats_used          integer     not null default 1,
  seats_limit         integer     not null default 5,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function update_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row execute procedure update_settings_updated_at();

drop trigger if exists org_settings_updated_at on org_settings;
create trigger org_settings_updated_at
  before update on org_settings
  for each row execute procedure update_settings_updated_at();

create or replace function handle_new_user_settings()
returns trigger language plpgsql security definer as $$
begin
  insert into user_settings (id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute procedure handle_new_user_settings();

alter table user_settings enable row level security;
alter table org_settings   enable row level security;

drop policy if exists "user_settings_self" on user_settings;
create policy "user_settings_self" on user_settings
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "org_settings_member" on org_settings;
create policy "org_settings_member" on org_settings
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.org_id = org_settings.org_id
        and p.role in ('org', 'triager', 'admin')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.org_id = org_settings.org_id
        and p.role in ('org', 'triager', 'admin')
    )
  );

create index if not exists user_settings_id_idx on user_settings(id);
create index if not exists org_settings_org_id_idx on org_settings(org_id);
  `;

  const result = await runSQL(migrationSQL);

  return NextResponse.json({
    message: "Migration 012_settings attempted",
    status: result.status,
    response: result.body,
  });
}
