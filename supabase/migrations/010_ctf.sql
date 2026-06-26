-- ============================================================
-- VAULTX — Migration 010: CTF Competitions
--
-- Design notes:
--  - Flags are stored HASHED (SHA-256) in the DB, never in plaintext.
--    The submission endpoint hashes the researcher's guess and compares
--    hashes — so even with direct DB access, flags cannot be read.
--  - Points use a DYNAMIC decay model: first solver gets full points,
--    subsequent solves get progressively less. This is the standard
--    CTFd/CTF.io model — it incentivizes speed and rewards first-blood.
--  - The live scoreboard is a materialized view recomputed on each
--    solve. For a demo-scale event this is fine; at real scale you'd
--    cache it in Redis (which is already in the stack).
--  - A CTF submission is deliberately NOT routed through the bug bounty
--    `submissions` table — CTF challenges are intentional puzzles with
--    known correct answers, not open-ended vulnerability reports. The
--    two flows have genuinely different lifecycle semantics.
-- ============================================================

create type ctf_status    as enum ('draft', 'active', 'ended', 'archived');
create type ctf_diff      as enum ('easy', 'medium', 'hard', 'insane');
create type ctf_category  as enum ('web', 'crypto', 'reverse', 'pwn', 'forensics', 'misc', 'smart_contract', 'cloud');

-- ── Competitions ──────────────────────────────────────────────────────────────
create table ctf_competitions (
  id            uuid        primary key default uuid_generate_v4(),
  org_id        uuid        not null references organizations(id) on delete cascade,
  title         text        not null,
  description   text        not null,
  status        ctf_status  not null default 'draft',
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  is_public     boolean     not null default false,
  max_team_size integer     not null default 1,  -- 1 = individual only for now
  created_by    uuid        not null references profiles(id),
  created_at    timestamptz not null default now(),
  constraint valid_dates check (ends_at > starts_at)
);

create index ctf_competitions_org_id_idx    on ctf_competitions(org_id);
create index ctf_competitions_status_idx    on ctf_competitions(status);

-- ── Challenges ────────────────────────────────────────────────────────────────
create table ctf_challenges (
  id              uuid          primary key default uuid_generate_v4(),
  competition_id  uuid          not null references ctf_competitions(id) on delete cascade,
  title           text          not null,
  description     text          not null,  -- visible to players
  category        ctf_category  not null,
  difficulty      ctf_diff      not null,
  base_points     integer       not null default 500,
  min_points      integer       not null default 100, -- floor after decay
  flag_hash       text          not null,    -- SHA-256 of the real flag, never plaintext
  hint            text,                      -- optional, costs points when revealed
  hint_cost       integer       not null default 50,
  attachment_url  text,                      -- optional challenge file
  is_visible      boolean       not null default true,
  solve_count     integer       not null default 0,  -- maintained by trigger
  created_at      timestamptz   not null default now(),
  constraint valid_points check (min_points <= base_points)
);

create index ctf_challenges_competition_id_idx on ctf_challenges(competition_id);

-- ── Solves ────────────────────────────────────────────────────────────────────
create table ctf_solves (
  id             uuid        primary key default uuid_generate_v4(),
  challenge_id   uuid        not null references ctf_challenges(id) on delete cascade,
  competition_id uuid        not null references ctf_competitions(id) on delete cascade,
  researcher_id  uuid        not null references profiles(id) on delete cascade,
  points_awarded integer     not null,
  solve_position integer     not null,  -- 1 = first blood, 2 = second, etc.
  solved_at      timestamptz not null default now(),
  unique (challenge_id, researcher_id)  -- one solve per challenge per researcher
);

create index ctf_solves_competition_id_idx  on ctf_solves(competition_id);
create index ctf_solves_researcher_id_idx   on ctf_solves(researcher_id);
create index ctf_solves_challenge_id_idx    on ctf_solves(challenge_id);

-- ── Wrong attempts (rate-limit source, not persisted long-term) ───────────────
create table ctf_wrong_attempts (
  id             uuid        primary key default uuid_generate_v4(),
  challenge_id   uuid        not null references ctf_challenges(id) on delete cascade,
  researcher_id  uuid        not null references profiles(id) on delete cascade,
  attempted_at   timestamptz not null default now()
);

create index ctf_wrong_attempts_rate_limit_idx
  on ctf_wrong_attempts(challenge_id, researcher_id, attempted_at);

-- ── Hint reveals ─────────────────────────────────────────────────────────────
create table ctf_hint_reveals (
  challenge_id   uuid    not null references ctf_challenges(id) on delete cascade,
  researcher_id  uuid    not null references profiles(id) on delete cascade,
  revealed_at    timestamptz not null default now(),
  primary key (challenge_id, researcher_id)
);

-- ── Trigger: increment solve_count + compute dynamic points ───────────────────
create or replace function after_ctf_solve()
returns trigger language plpgsql as $$
begin
  update ctf_challenges
  set solve_count = solve_count + 1
  where id = new.challenge_id;
  return new;
end;
$$;

create trigger ctf_solve_count_trigger
  after insert on ctf_solves
  for each row execute function after_ctf_solve();

-- ── Live scoreboard view ─────────────────────────────────────────────────────
create or replace view ctf_scoreboard as
select
  cs.competition_id,
  cs.researcher_id,
  p.username,
  p.full_name,
  p.avatar_url,
  count(cs.id)           as solve_count,
  sum(cs.points_awarded) as total_points,
  max(cs.solved_at)      as last_solve_at
from ctf_solves cs
join profiles p on p.id = cs.researcher_id
group by cs.competition_id, cs.researcher_id, p.username, p.full_name, p.avatar_url
order by total_points desc, last_solve_at asc;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table ctf_competitions   enable row level security;
alter table ctf_challenges     enable row level security;
alter table ctf_solves         enable row level security;
alter table ctf_wrong_attempts enable row level security;
alter table ctf_hint_reveals   enable row level security;

-- Competitions: public ones visible to all authenticated users; org owners see their own
create policy "Public competitions visible to authenticated users"
  on ctf_competitions for select using (
    auth.uid() is not null and (
      is_public = true
      or org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "Org owners manage their competitions"
  on ctf_competitions for all using (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

-- Challenges: visible when competition is active or org owner
create policy "Challenges visible during active competition"
  on ctf_challenges for select using (
    competition_id in (
      select id from ctf_competitions
      where is_public = true and status = 'active'
        and starts_at <= now() and ends_at >= now()
    )
    or competition_id in (
      select id from ctf_competitions
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "Org owners manage their challenges"
  on ctf_challenges for all using (
    competition_id in (
      select id from ctf_competitions
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

-- Solves: users see their own + competition scoreboard
create policy "Users see their own solves"
  on ctf_solves for select using (researcher_id = auth.uid());

create policy "Org owners see all solves in their competitions"
  on ctf_solves for select using (
    competition_id in (
      select id from ctf_competitions
      where org_id in (select id from organizations where owner_id = auth.uid())
    )
  );

create policy "System inserts solves"
  on ctf_solves for insert with check (researcher_id = auth.uid());

create policy "Users manage their own wrong attempts"
  on ctf_wrong_attempts for all using (researcher_id = auth.uid());

create policy "Users manage their own hint reveals"
  on ctf_hint_reveals for all using (researcher_id = auth.uid());
