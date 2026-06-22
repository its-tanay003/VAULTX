-- ============================================================
-- VAULTX — Migration 005: Code Quality + Reward Refinements
-- ============================================================

-- ── Code repos (PUBLIC repos only — no OAuth tokens stored) ───────────────────
-- Zero-cost design: uses GitHub's unauthenticated public API (60 req/hr limit,
-- fine for a demo). Private repo support via GitHub App is a post-MVP item.
create table code_repos (
  id              uuid        primary key default uuid_generate_v4(),
  org_id          uuid        references organizations(id) on delete cascade,
  profile_id      uuid        references profiles(id) on delete cascade,
  github_url      text        not null,
  owner_name      text        not null,   -- e.g. "vercel"
  repo_name       text        not null,   -- e.g. "next.js"
  default_branch  text        not null default 'main',
  connected_by    uuid        not null references profiles(id) on delete cascade,
  last_scanned_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint code_repos_owner check (org_id is not null or profile_id is not null),
  unique (org_id, github_url),
  unique (profile_id, github_url)
);

create index code_repos_org_id_idx     on code_repos(org_id);
create index code_repos_profile_id_idx on code_repos(profile_id);

-- ── Code scans ──────────────────────────────────────────────────────────────────
create table code_scans (
  id            uuid        primary key default uuid_generate_v4(),
  repo_id       uuid        not null references code_repos(id) on delete cascade,
  status        text        not null default 'pending' check (status in ('pending','running','complete','failed')),
  score         integer     check (score between 0 and 100),
  summary       text,
  findings      jsonb       not null default '[]',
  files_scanned integer     not null default 0,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index code_scans_repo_id_idx on code_scans(repo_id);

alter table code_repos enable row level security;
alter table code_scans enable row level security;

create policy "Users read their own connected repos"
  on code_repos for select using (
    profile_id = auth.uid()
    or org_id in (select id from organizations where owner_id = auth.uid())
    or org_id in (select org_id from profiles where id = auth.uid() and org_id is not null)
  );

create policy "Users can connect repos"
  on code_repos for insert with check (
    connected_by = auth.uid()
    and (
      profile_id = auth.uid()
      or org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "Users can remove their own repos"
  on code_repos for delete using (
    profile_id = auth.uid()
    or org_id in (select id from organizations where owner_id = auth.uid())
  );

create policy "Scans visible to repo owners"
  on code_scans for select using (
    repo_id in (
      select id from code_repos
      where profile_id = auth.uid()
         or org_id in (select id from organizations where owner_id = auth.uid())
         or org_id in (select org_id from profiles where id = auth.uid() and org_id is not null)
    )
  );

create policy "System manages scan lifecycle"
  on code_scans for insert with check (true);

create policy "System updates scan results"
  on code_scans for update using (true);

-- ── Reward helper view (for leaderboard total-earned calc) ─────────────────────
create or replace view researcher_earnings as
select
  researcher_id,
  count(*) filter (where status = 'paid')      as paid_count,
  coalesce(sum(amount) filter (where status = 'paid'), 0)      as total_paid,
  coalesce(sum(amount) filter (where status = 'approved'), 0)  as total_pending
from rewards
group by researcher_id;

-- Public-safe leaderboard view (no PII beyond what profile already exposes)
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
group by p.id, re.total_paid
order by p.reputation desc;
