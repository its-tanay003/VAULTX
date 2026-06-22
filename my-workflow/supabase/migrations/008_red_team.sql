-- ============================================================
-- VAULTX — Migration 008: AI Red Team
--
-- Design notes:
--  - Per the original product promise ("findings route through the same
--    triage queue your human researchers already use"), AI Red Team
--    findings are NOT a parallel table — they become real rows in
--    `submissions`, attributed to a system AI agent profile, going
--    through the exact same Accept/Reject/Duplicate triage flow built
--    in Week 4.
--  - `profiles.is_system_agent` distinguishes the AI's profile from
--    real humans for UI treatment (badge instead of avatar/reputation)
--    and is excluded from the leaderboard view below.
--  - Each org gets one auto-provisioned internal program ("AI Red Team
--    Findings") to house these submissions, created lazily on first
--    target activation — keeps AI-originated findings separate from
--    public-facing bug bounty programs without requiring a schema
--    change to submissions/programs.
-- ============================================================

create type red_team_target_type     as enum ('github_repo', 'scope_description');
create type red_team_aggression      as enum ('passive', 'standard', 'aggressive');
create type red_team_scan_status     as enum ('running', 'complete', 'failed');

-- ── System agent flag ─────────────────────────────────────────────────────────
alter table profiles add column is_system_agent boolean not null default false;

-- ── Targets ──────────────────────────────────────────────────────────────────
create table red_team_targets (
  id                uuid                    primary key default uuid_generate_v4(),
  org_id            uuid                    not null references organizations(id) on delete cascade,
  name              text                    not null,
  target_type       red_team_target_type    not null,
  target_value      text                    not null,  -- github URL, or free-text scope description
  aggression_level  red_team_aggression     not null default 'standard',
  is_active         boolean                 not null default true,
  last_scanned_at   timestamptz,
  created_by        uuid                    not null references profiles(id),
  created_at        timestamptz             not null default now()
);

create index red_team_targets_org_id_idx on red_team_targets(org_id);

-- ── Scans ────────────────────────────────────────────────────────────────────
create table red_team_scans (
  id                uuid                  primary key default uuid_generate_v4(),
  target_id         uuid                  not null references red_team_targets(id) on delete cascade,
  status            red_team_scan_status  not null default 'running',
  reasoning_trace   jsonb                 not null default '[]',  -- [{ step: int, thought: string }]
  findings_created  integer               not null default 0,
  submission_ids    uuid[]                not null default '{}',
  error             text,
  started_at        timestamptz           not null default now(),
  completed_at      timestamptz
);

create index red_team_scans_target_id_idx on red_team_scans(target_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table red_team_targets enable row level security;
alter table red_team_scans   enable row level security;

create policy "Org owners manage their red team targets"
  on red_team_targets for all using (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

create policy "Org owners view scans on their targets"
  on red_team_scans for select using (
    target_id in (
      select id from red_team_targets
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "System manages scan lifecycle"
  on red_team_scans for insert with check (true);

create policy "System updates scan results"
  on red_team_scans for update using (true);

-- ── Exclude system agents from the leaderboard ────────────────────────────────
-- (full replacement of the Week 6 view definition — same logic, one extra filter)
create or replace view leaderboard as
select
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.reputation,
  count(s.id) filter (where s.status = 'accepted' or s.status = 'resolved') as accepted_count,
  count(s.id)                                                                as total_submissions,
  coalesce(re.total_paid, 0)                                                 as total_earned
from profiles p
left join submissions s on s.researcher_id = p.id
left join researcher_earnings re on re.researcher_id = p.id
where p.role = 'researcher'
  and coalesce(p.is_system_agent, false) = false
group by p.id, re.total_paid
order by p.reputation desc;
