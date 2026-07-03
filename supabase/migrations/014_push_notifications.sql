-- ============================================================
-- VAULTX — Migration 014: Web Push Notifications
-- ============================================================
-- Stores browser Push API subscriptions so the server can deliver
-- native OS-level push notifications even when the dashboard tab
-- is closed. Complements (does not replace) the existing in-app
-- `notifications` table + Supabase Realtime channel from 003.
--
-- One user can have multiple subscriptions (desktop browser, phone
-- browser, etc). Each row is one browser's PushSubscription object.

create table push_subscriptions (
  id          uuid          primary key default uuid_generate_v4(),
  user_id     uuid          not null references profiles(id) on delete cascade,
  endpoint    text          not null,
  p256dh      text          not null,   -- subscription.keys.p256dh
  auth_key    text          not null,   -- subscription.keys.auth
  user_agent  text,
  created_at  timestamptz   not null default now(),
  last_used_at timestamptz  not null default now(),

  constraint push_subscriptions_endpoint_unique unique (user_id, endpoint)
);

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (server-side send routine) needs to read across users
-- to deliver notifications and prune dead subscriptions on 404/410.
create policy "Service role reads all push subscriptions"
  on push_subscriptions for select
  to service_role
  using (true);

create policy "Service role deletes dead push subscriptions"
  on push_subscriptions for delete
  to service_role
  using (true);
