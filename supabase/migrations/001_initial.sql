-- ============================================================
-- VAULTX — Initial Schema Migration
-- Run via: supabase db push  OR  paste in Supabase SQL Editor
-- ============================================================

-- ── Cleanup (for idempotent development seeding) ───────────────
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists audit_logs cascade;
drop table if exists rewards cascade;
drop table if exists submissions cascade;
drop table if exists programs cascade;
drop table if exists organizations cascade;
drop table if exists profiles cascade;

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";    -- fuzzy text search (duplicate detection stage 2)
create extension if not exists "pgcrypto";   -- gen_random_uuid, pgp_sym_encrypt

-- Fallback to map uuid_generate_v4 to gen_random_uuid in public schema
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- ── Enums ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('org', 'researcher', 'triager', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_type') then
    create type program_type as enum ('bug_bounty', 'vdp');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_status') then
    create type program_status as enum ('draft', 'active', 'paused', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type submission_status as enum ('new', 'triaging', 'needs_info', 'accepted', 'rejected', 'duplicate', 'wont_fix', 'resolved');
  end if;
  if not exists (select 1 from pg_type where typname = 'severity_level') then
    create type severity_level as enum ('critical', 'high', 'medium', 'low', 'info');
  end if;
  if not exists (select 1 from pg_type where typname = 'reward_status') then
    create type reward_status as enum ('pending', 'approved', 'paid', 'declined');
  end if;
end$$;

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- Mirrors auth.users. Auto-created on signup via trigger below.
create table profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null,
  full_name     text,
  avatar_url    text,
  username      text        unique,
  role          user_role   not null default 'researcher',
  org_id        uuid,       -- set if role = 'org' | 'triager'
  bio           text,
  website       text,
  twitter       text,
  github        text,
  reputation    integer     not null default 0 check (reputation >= 0),
  is_onboarded  boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Organizations ──────────────────────────────────────────────────────────────
create table organizations (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  slug        text        not null unique,
  logo_url    text,
  website     text,
  description text,
  industry    text,
  owner_id    uuid        not null references profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Back-fill FK from profiles → organizations
alter table profiles
  add constraint profiles_org_id_fkey
  foreign key (org_id) references organizations(id) on delete set null;

-- ── Programs ───────────────────────────────────────────────────────────────────
create table programs (
  id                  uuid            primary key default uuid_generate_v4(),
  org_id              uuid            not null references organizations(id) on delete cascade,
  name                text            not null,
  slug                text            not null,
  type                program_type    not null default 'bug_bounty',
  status              program_status  not null default 'draft',
  description         text            not null default '',
  scope_in            text[]          not null default '{}',
  scope_out           text[]          not null default '{}',
  rules               text            not null default '',
  min_reward          integer         check (min_reward >= 0),
  max_reward          integer         check (max_reward >= 0),
  avg_response_hours  integer         not null default 72,
  total_submissions   integer         not null default 0 check (total_submissions >= 0),
  total_paid          integer         not null default 0 check (total_paid >= 0),
  is_public           boolean         not null default true,
  created_at          timestamptz     not null default now(),
  updated_at          timestamptz     not null default now(),
  unique (org_id, slug),
  constraint max_gte_min check (max_reward is null or min_reward is null or max_reward >= min_reward)
);

create index programs_org_id_idx    on programs(org_id);
create index programs_status_idx    on programs(status);
create index programs_is_public_idx on programs(is_public) where is_public = true;

-- ── Submissions ────────────────────────────────────────────────────────────────
create table submissions (
  id                  uuid              primary key default uuid_generate_v4(),
  program_id          uuid              not null references programs(id) on delete cascade,
  researcher_id       uuid              not null references profiles(id) on delete restrict,
  title               text              not null,
  description         text              not null,
  steps_to_reproduce  text              not null default '',
  impact              text              not null default '',
  severity            severity_level    not null,
  status              submission_status not null default 'new',
  -- AI fields
  ai_severity         severity_level,
  ai_confidence       numeric(3,2)      check (ai_confidence between 0 and 1),
  ai_duplicate_of     uuid              references submissions(id) on delete set null,
  ai_analysis         text,
  -- Dedup
  content_hash        text              not null,  -- SHA-256(title||description)
  -- Files
  attachments         text[]            not null default '{}',
  -- Triager
  triager_id          uuid              references profiles(id) on delete set null,
  triager_note        text,
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz       not null default now()
);

create index submissions_program_id_idx    on submissions(program_id);
create index submissions_researcher_id_idx on submissions(researcher_id);
create index submissions_status_idx        on submissions(status);
create index submissions_content_hash_idx  on submissions(content_hash);
-- GIN index for pg_trgm fuzzy search (duplicate detection stage 2)
create index submissions_title_trgm_idx on submissions using gin (title gin_trgm_ops);
create index submissions_desc_trgm_idx  on submissions using gin (description gin_trgm_ops);

-- ── Rewards ────────────────────────────────────────────────────────────────────
create table rewards (
  id            uuid          primary key default uuid_generate_v4(),
  submission_id uuid          not null references submissions(id) on delete cascade,
  org_id        uuid          not null references organizations(id) on delete cascade,
  researcher_id uuid          not null references profiles(id) on delete restrict,
  amount        integer       not null check (amount > 0),
  currency      text          not null default 'USD',
  status        reward_status not null default 'pending',
  approved_by   uuid          references profiles(id) on delete set null,
  approved_at   timestamptz,
  paid_at       timestamptz,
  note          text,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  unique (submission_id)      -- one reward per submission
);

create index rewards_org_id_idx        on rewards(org_id);
create index rewards_researcher_id_idx on rewards(researcher_id);
create index rewards_status_idx        on rewards(status);

-- ── Audit Logs (IMMUTABLE) ─────────────────────────────────────────────────────
create table audit_logs (
  id         uuid        primary key default uuid_generate_v4(),
  actor_id   uuid        references profiles(id) on delete set null,
  action     text        not null,
  entity     text        not null,
  entity_id  uuid,
  before     jsonb,
  after      jsonb,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx  on audit_logs(actor_id);
create index audit_logs_entity_idx    on audit_logs(entity, entity_id);
create index audit_logs_created_at_idx on audit_logs(created_at desc);

-- ── Triggers ───────────────────────────────────────────────────────────────────

-- 1. Auto-create profile on auth.users insert
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. updated_at auto-stamp
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger set_programs_updated_at
  before update on programs
  for each row execute function set_updated_at();

create trigger set_submissions_updated_at
  before update on submissions
  for each row execute function set_updated_at();

create trigger set_rewards_updated_at
  before update on rewards
  for each row execute function set_updated_at();

-- 3. PLATFORM INVARIANT #1: AI CANNOT APPROVE REWARDS
--    approved_by must be a human (role != 'ai_agent').
--    For now: enforced by requiring approved_by to be a valid profile.
--    AI writes to ai_severity/ai_confidence only — never to rewards.approved_by.
create or replace function enforce_human_reward_approval()
returns trigger language plpgsql security definer as $$
begin
  if new.status in ('approved', 'paid') then
    if new.approved_by is null then
      raise exception 'Reward approval requires a human approver (approved_by cannot be null)';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_human_reward_approval_trigger
  before insert or update on rewards
  for each row execute function enforce_human_reward_approval();

-- 4. PLATFORM INVARIANT #2: AUDIT LOG IS IMMUTABLE
create or replace function block_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit logs are immutable and cannot be updated or deleted';
end;
$$;

create trigger audit_logs_no_update
  before update on audit_logs
  for each row execute function block_audit_mutation();

create trigger audit_logs_no_delete
  before delete on audit_logs
  for each row execute function block_audit_mutation();

-- 5. Increment program submission counter on new submission
create or replace function increment_program_submission_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update programs set total_submissions = total_submissions + 1 where id = new.program_id;
  end if;
  return new;
end;
$$;

create trigger on_submission_created
  after insert on submissions
  for each row execute function increment_program_submission_count();

-- 6. Update researcher reputation when submission is accepted
create or replace function update_researcher_reputation()
returns trigger language plpgsql security definer as $$
declare
  rep_delta integer;
begin
  -- Only act on status transitions → accepted
  if old.status != 'accepted' and new.status = 'accepted' then
    rep_delta := case new.severity
      when 'critical' then 100
      when 'high'     then  50
      when 'medium'   then  25
      when 'low'      then  10
      when 'info'     then   5
      else                   5
    end;
    update profiles set reputation = reputation + rep_delta where id = new.researcher_id;
  end if;
  return new;
end;
$$;

create trigger on_submission_accepted
  after update on submissions
  for each row execute function update_researcher_reputation();

-- 7. Helper to check if a user is an org owner or member (non-recursive security definer)
create or replace function public.check_user_is_org_member(user_id uuid, org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from organizations where id = org_id and owner_id = user_id
  ) or exists (
    select 1 from profiles where id = user_id and profiles.org_id = check_user_is_org_member.org_id
  );
end;
$$;

-- 8. Helper to check if an org can read a researcher profile (non-recursive security definer)
create or replace function public.check_org_can_read_profile(profile_id uuid, user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from submissions s
    join programs p on p.id = s.program_id
    join organizations o on o.id = p.org_id
    where s.researcher_id = profile_id
      and (o.owner_id = user_id or exists (
        select 1 from profiles where id = user_id and profiles.org_id = o.id
      ))
  );
end;
$$;

-- ── Row Level Security ─────────────────────────────────────────────────────────
alter table profiles      enable row level security;
alter table organizations enable row level security;
alter table programs      enable row level security;
alter table submissions   enable row level security;
alter table rewards       enable row level security;
alter table audit_logs    enable row level security;

-- profiles
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Orgs can read researcher profiles for their submissions"
  on profiles for select using (
    check_org_can_read_profile(id, auth.uid())
  );

-- organizations
create policy "Org members can read their org"
  on organizations for select using (
    owner_id = auth.uid()
    or check_user_is_org_member(auth.uid(), id)
  );

create policy "Org owners can update their org"
  on organizations for update using (owner_id = auth.uid());

create policy "Authenticated users can create org"
  on organizations for insert with check (auth.uid() = owner_id);

-- programs
create policy "Public programs are visible to all authenticated users"
  on programs for select using (
    is_public = true
    or check_user_is_org_member(auth.uid(), org_id)
  );

create policy "Org owners and triagers can insert programs"
  on programs for insert with check (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

create policy "Org owners and triagers can update programs"
  on programs for update using (
    org_id in (
      select id from organizations where owner_id = auth.uid()
      union
      select org_id from profiles where id = auth.uid() and role = 'triager'
    )
  );

-- submissions
create policy "Researchers can see their own submissions"
  on submissions for select using (researcher_id = auth.uid());

create policy "Org members can see submissions to their programs"
  on submissions for select using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and check_user_is_org_member(auth.uid(), p.org_id)
    )
  );

create policy "Authenticated researchers can create submissions"
  on submissions for insert with check (
    auth.uid() = researcher_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'researcher')
  );

create policy "Triagers and org owners can update submissions"
  on submissions for update using (
    program_id in (
      select p.id from programs p
      join organizations o on o.id = p.org_id
      where o.owner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('triager', 'admin'))
  );

-- rewards
create policy "Researchers see their own rewards"
  on rewards for select using (researcher_id = auth.uid());

create policy "Org owners see rewards for their programs"
  on rewards for select using (org_id in (select id from organizations where owner_id = auth.uid()));

create policy "Org owners can create reward proposals"
  on rewards for insert with check (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

create policy "Org owners can update rewards (approve/pay)"
  on rewards for update using (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

-- audit_logs: read-only for org owners and admins, no mutations (enforced by trigger)
create policy "Org owners can read audit logs for their entities"
  on audit_logs for select using (
    actor_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Seed data (development only — remove before production) ───────────────────
-- Uncomment to seed test data:
-- insert into organizations (name, slug, owner_id) values ('Acme Corp', 'acme-corp', auth.uid());
