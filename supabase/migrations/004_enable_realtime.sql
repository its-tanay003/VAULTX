-- ============================================================
-- VAULTX — Migration 004: Enable Realtime
-- ============================================================

-- Add tables to the supabase_realtime publication so postgres_changes
-- subscriptions work in the browser (used by RealtimeSubmissionStatus
-- and NotificationBell components).

alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table notifications;

-- Note: RLS policies still apply to realtime subscriptions.
-- A researcher will only receive UPDATE events for submissions they own
-- or have access to via existing RLS policies from migration 001.
