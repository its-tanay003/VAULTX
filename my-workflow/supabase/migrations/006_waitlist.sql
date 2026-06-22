-- ============================================================
-- VAULTX — Migration 006: Feature waitlist
-- Backs the PTaaS and AI Red Team stub pages — captures genuine
-- interest signal instead of being a dead-end "coming soon" page.
-- ============================================================

create table feature_waitlist (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  feature    text not null check (feature in ('ptaas', 'ai_red_team')),
  created_at timestamptz not null default now(),
  unique (user_id, feature)
);

alter table feature_waitlist enable row level security;

create policy "Users can join waitlists"
  on feature_waitlist for insert with check (auth.uid() = user_id);

create policy "Users can see their own waitlist entries"
  on feature_waitlist for select using (auth.uid() = user_id);

-- Admin-only aggregate view for gauging real demand
create or replace view waitlist_summary as
select feature, count(*) as signups
from feature_waitlist
group by feature
order by signups desc;
