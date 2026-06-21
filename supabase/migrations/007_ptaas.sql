-- ============================================================
-- VAULTX — Migration 007: PTaaS (Penetration Testing as a Service)
--
-- Design notes:
--  - Reuses the existing 'researcher' role as the assigned pentester —
--    no new role type. An org picks a researcher (often from their own
--    leaderboard) to run a scoped, time-boxed engagement, rather than
--    accepting open submissions like the bug bounty flow.
--  - Reuses severity_level enum from migration 001 — one severity
--    taxonomy across the whole platform, not a parallel one.
--  - Findings are deliberately NOT in the `submissions` table. That
--    table's RLS, dedup, and notification logic are all coupled to the
--    open bug-bounty submission flow. Pentest findings have a different
--    lifecycle (engagement-scoped, retest workflow, report rollup) —
--    cleaner as its own table than overloading submissions with
--    conditional logic.
-- ============================================================

create type engagement_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type finding_status    as enum ('open', 'fixed', 'needs_retest', 'closed', 'wont_fix');

-- ── Engagements ─────────────────────────────────────────────────────────────
create table pentest_engagements (
  id                     uuid              primary key default uuid_generate_v4(),
  org_id                 uuid              not null references organizations(id) on delete cascade,
  name                   text              not null,
  status                 engagement_status not null default 'scheduled',
  scope_description      text              not null,
  objectives             text,
  start_date             date              not null,
  end_date               date              not null,
  assigned_pentester_id  uuid              references profiles(id) on delete set null,
  test_plan              jsonb,            -- AI-generated structured plan: { phases: [{title, tasks: [string]}] }
  created_by             uuid              not null references profiles(id),
  created_at             timestamptz       not null default now(),
  updated_at             timestamptz       not null default now(),
  constraint valid_dates check (end_date >= start_date)
);

create index pentest_engagements_org_id_idx     on pentest_engagements(org_id);
create index pentest_engagements_pentester_idx  on pentest_engagements(assigned_pentester_id);

-- ── Findings ─────────────────────────────────────────────────────────────────
create table pentest_findings (
  id                  uuid           primary key default uuid_generate_v4(),
  engagement_id       uuid           not null references pentest_engagements(id) on delete cascade,
  title               text           not null,
  description         text           not null,
  steps_to_reproduce  text,
  impact              text,
  severity            severity_level not null,
  status              finding_status not null default 'open',
  ai_severity         severity_level,
  ai_confidence       numeric(3,2),
  reported_by         uuid           not null references profiles(id),
  retest_notes        text,
  retested_at         timestamptz,
  created_at          timestamptz    not null default now(),
  updated_at          timestamptz    not null default now()
);

create index pentest_findings_engagement_id_idx on pentest_findings(engagement_id);

-- ── Reports (AI-generated rollup of an engagement's findings) ──────────────────
create table pentest_reports (
  id              uuid        primary key default uuid_generate_v4(),
  engagement_id   uuid        not null references pentest_engagements(id) on delete cascade,
  executive_summary text      not null,
  full_report     jsonb       not null,  -- { sections: [{title, content}], findings_summary: {...}, recommendations: [string] }
  generated_at    timestamptz not null default now()
);

create index pentest_reports_engagement_id_idx on pentest_reports(engagement_id);

-- ── updated_at triggers (reuse the pattern from migration 001) ────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pentest_engagements_updated_at
  before update on pentest_engagements
  for each row execute function set_updated_at();

create trigger pentest_findings_updated_at
  before update on pentest_findings
  for each row execute function set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table pentest_engagements enable row level security;
alter table pentest_findings    enable row level security;
alter table pentest_reports     enable row level security;

-- Engagements: org owner has full access; assigned pentester can view + update their own
create policy "Org owners manage their engagements"
  on pentest_engagements for all using (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

create policy "Assigned pentester can view their engagements"
  on pentest_engagements for select using (
    assigned_pentester_id = auth.uid()
  );

create policy "Assigned pentester can update their engagements"
  on pentest_engagements for update using (
    assigned_pentester_id = auth.uid()
  );

-- Findings: visible to org owner of the parent engagement, and the assigned pentester
create policy "Org owners manage findings on their engagements"
  on pentest_findings for all using (
    engagement_id in (
      select id from pentest_engagements
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "Assigned pentester manages findings on their engagements"
  on pentest_findings for all using (
    engagement_id in (
      select id from pentest_engagements where assigned_pentester_id = auth.uid()
    )
  );

-- Reports: same visibility as the parent engagement
create policy "Org owners view reports on their engagements"
  on pentest_reports for select using (
    engagement_id in (
      select id from pentest_engagements
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "Assigned pentester views reports on their engagements"
  on pentest_reports for select using (
    engagement_id in (
      select id from pentest_engagements where assigned_pentester_id = auth.uid()
    )
  );

create policy "System can insert reports"
  on pentest_reports for insert with check (true);
