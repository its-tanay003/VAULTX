-- ============================================================
-- VAULTX — Reset Demo Data
-- Run in Supabase SQL Editor before re-running seed-demo-data.mjs
-- if you want a completely clean slate instead of accumulating
-- data across multiple seed runs.
--
-- This does NOT delete your own org owner account or organization —
-- only synthetic researcher accounts (matched by the @vaultx-demo.test
-- email domain used by the seed script) and everything that cascades
-- from them.
-- ============================================================

-- Delete synthetic researcher auth users (cascades to profiles,
-- submissions, rewards via ON DELETE CASCADE / RESTRICT handling)
delete from auth.users
where email like '%@vaultx-demo.test';

-- Clean up any orphaned submissions/rewards from prior runs that
-- somehow didn't cascade (defensive — shouldn't normally be needed)
delete from rewards
where researcher_id not in (select id from profiles);

delete from submissions
where researcher_id not in (select id from profiles);

-- Reset program counters (will re-populate correctly on next seed run
-- via the increment_program_submission_count trigger)
update programs set total_submissions = 0, total_paid = 0;

-- Confirm cleanup
select
  (select count(*) from profiles where role = 'researcher') as remaining_researchers,
  (select count(*) from submissions) as remaining_submissions,
  (select count(*) from rewards) as remaining_rewards;
