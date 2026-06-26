-- ============================================================
-- VAULTX — Migration 011: Code4rena-Style Audit Contests
--
-- Key design differences from bug bounty:
--  - DUPLICATE HANDLING: duplicates SPLIT rewards instead of being
--    rejected. If three auditors find the same high-severity bug,
--    all three get paid — just at a lower rate than if they'd been
--    unique. This is the core mechanic that makes contest auditing
--    different from traditional bug bounty.
--  - FIXED POOL: org commits a total reward pool upfront. Distribution
--    is calculated post-contest based on actual submissions, not
--    per-bounty amounts negotiated per finding.
--  - JUDGING PHASE: after the contest closes, a separate judging phase
--    de-duplicates, confirms severity, and marks findings valid/invalid
--    before pool distribution runs.
--  - POOL DISTRIBUTION FORMULA (standard Code4rena model):
--    Each valid finding earns "shares" = severity_weight / duplicate_count
--    Payout = (shares / total_shares) * pool_amount
--    Severity weights: critical=10, high=5, medium=2, low=0.5, info=0
-- ============================================================

create type contest_status   as enum ('draft','open','judging','complete','archived');
create type finding_status   as enum ('submitted','valid','invalid','duplicate');
create type judging_outcome  as enum ('unique','duplicate_of');

-- ── Contests ─────────────────────────────────────────────────────────────────
create table audit_contests (
  id                uuid            primary key default uuid_generate_v4(),
  org_id            uuid            not null references organizations(id) on delete cascade,
  title             text            not null,
  description       text            not null,
  repo_url          text            not null,   -- public github repo being audited
  repo_branch       text            not null default 'main',
  scope_description text            not null,   -- what's in scope
  pool_amount       numeric(12,2)   not null,
  pool_currency     text            not null default 'USD',
  status            contest_status  not null default 'draft',
  starts_at         timestamptz     not null,
  ends_at           timestamptz     not null,
  judging_ends_at   timestamptz,              -- deadline for judging phase
  is_public         boolean         not null default true,
  created_by        uuid            not null references profiles(id),
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now(),
  constraint valid_dates check (ends_at > starts_at)
);

create index audit_contests_org_id_idx  on audit_contests(org_id);
create index audit_contests_status_idx  on audit_contests(status);

-- ── Contest findings (auditor submissions) ────────────────────────────────────
create table contest_findings (
  id                uuid            primary key default uuid_generate_v4(),
  contest_id        uuid            not null references audit_contests(id) on delete cascade,
  auditor_id        uuid            not null references profiles(id) on delete cascade,
  title             text            not null,
  description       text            not null,
  severity          severity_level  not null,
  steps_to_reproduce text,
  impact            text,
  suggested_fix     text,
  affected_files    text[],         -- array of file paths
  status            finding_status  not null default 'submitted',
  -- Judging fields (filled during judging phase)
  judging_outcome   judging_outcome,
  duplicate_of      uuid            references contest_findings(id),
  confirmed_severity severity_level,          -- judge may adjust severity
  payout_amount     numeric(12,2),
  judged_by         uuid            references profiles(id),
  judged_at         timestamptz,
  judge_note        text,
  created_at        timestamptz     not null default now(),
  -- Each auditor can submit each unique finding once (title uniqueness
  -- per auditor per contest, not global — two auditors CAN submit the
  -- same issue and both get partial credit)
  unique (contest_id, auditor_id, title)
);

create index contest_findings_contest_id_idx  on contest_findings(contest_id);
create index contest_findings_auditor_id_idx  on contest_findings(auditor_id);

-- ── Pool distribution records ─────────────────────────────────────────────────
-- Written when judging completes, one row per paid finding
create table contest_payouts (
  id              uuid        primary key default uuid_generate_v4(),
  contest_id      uuid        not null references audit_contests(id) on delete cascade,
  finding_id      uuid        not null references contest_findings(id) on delete cascade,
  auditor_id      uuid        not null references profiles(id) on delete cascade,
  shares          numeric(10,4) not null,
  payout_amount   numeric(12,2) not null,
  status          text        not null default 'pending' check (status in ('pending','paid')),
  created_at      timestamptz not null default now()
);

create index contest_payouts_contest_id_idx  on contest_payouts(contest_id);
create index contest_payouts_auditor_id_idx  on contest_payouts(auditor_id);

-- ── Updated_at trigger ────────────────────────────────────────────────────────
create trigger audit_contests_updated_at
  before update on audit_contests
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table audit_contests    enable row level security;
alter table contest_findings  enable row level security;
alter table contest_payouts   enable row level security;

-- Contests: public ones visible to all; org owners see all their own
create policy "Public contests visible to authenticated users"
  on audit_contests for select using (
    auth.uid() is not null and (
      is_public = true
      or org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "Org owners manage their contests"
  on audit_contests for all using (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

-- Findings: auditor sees own; org owner sees all in their contests; during
-- judging everyone sees all (needed for duplicate detection by auditors)
create policy "Auditors see their own findings"
  on contest_findings for select using (auditor_id = auth.uid());

create policy "Org owners see all findings in their contests"
  on contest_findings for select using (
    contest_id in (
      select id from audit_contests
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "All auditors see findings after contest closes"
  on contest_findings for select using (
    contest_id in (
      select id from audit_contests
      where status in ('judging','complete') and is_public = true
    )
  );

create policy "Auditors submit findings during open contest"
  on contest_findings for insert with check (
    auditor_id = auth.uid()
    and contest_id in (
      select id from audit_contests
      where status = 'open' and starts_at <= now() and ends_at >= now()
    )
  );

create policy "Org judges update findings"
  on contest_findings for update using (
    contest_id in (
      select id from audit_contests
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

-- Payouts: auditors see their own; org owners see all in their contests
create policy "Auditors see their own payouts"
  on contest_payouts for select using (auditor_id = auth.uid());

create policy "Org owners see all payouts in their contests"
  on contest_payouts for select using (
    contest_id in (
      select id from audit_contests
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "System manages payouts"
  on contest_payouts for all with check (true);
