-- ============================================================
-- VAULTX — Migration 003: Notifications system
-- ============================================================

create type notification_type as enum (
  'submission_received',
  'submission_accepted',
  'submission_rejected',
  'submission_duplicate',
  'submission_needs_info',
  'submission_resolved',
  'reward_proposed',
  'reward_approved',
  'reward_paid',
  'new_program',
  'program_status_changed'
);

-- ── Notifications ──────────────────────────────────────────────────────────────
create table notifications (
  id          uuid                primary key default uuid_generate_v4(),
  user_id     uuid                not null references profiles(id) on delete cascade,
  type        notification_type   not null,
  title       text                not null,
  body        text                not null,
  link        text,               -- relative URL to navigate to
  entity      text,               -- e.g. 'submissions', 'rewards'
  entity_id   uuid,
  is_read     boolean             not null default false,
  created_at  timestamptz         not null default now()
);

create index notifications_user_id_idx    on notifications(user_id);
create index notifications_is_read_idx    on notifications(user_id, is_read) where is_read = false;
create index notifications_created_at_idx on notifications(created_at desc);

-- ── Notification preferences ───────────────────────────────────────────────────
create table notification_preferences (
  user_id             uuid    primary key references profiles(id) on delete cascade,
  -- In-app
  app_submission_new      boolean not null default true,
  app_submission_update   boolean not null default true,
  app_reward_update       boolean not null default true,
  -- Email
  email_submission_new    boolean not null default true,
  email_submission_update boolean not null default true,
  email_reward_update     boolean not null default true,
  email_digest_weekly     boolean not null default false,
  updated_at              timestamptz not null default now()
);

-- RLS
alter table notifications             enable row level security;
alter table notification_preferences  enable row level security;

create policy "Users read own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Users update own notifications"
  on notifications for update using (auth.uid() = user_id);

create policy "System can insert notifications"
  on notifications for insert with check (true); -- service role only in practice

create policy "Users read own prefs"
  on notification_preferences for select using (auth.uid() = user_id);

create policy "Users upsert own prefs"
  on notification_preferences for insert with check (auth.uid() = user_id);

create policy "Users update own prefs"
  on notification_preferences for update using (auth.uid() = user_id);

-- Auto-create default prefs on profile creation
create or replace function create_default_notification_prefs()
returns trigger language plpgsql security definer as $$
begin
  insert into notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_notification_prefs
  after insert on profiles
  for each row execute function create_default_notification_prefs();
