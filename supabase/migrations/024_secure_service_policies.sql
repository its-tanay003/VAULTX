-- ============================================================
-- VAULTX — Migration 024: Secure Service Role RLS Policies
-- ============================================================

-- 1. contest_payouts table policies
drop policy if exists "System manages payouts" on contest_payouts;
create policy "System manages payouts"
  on contest_payouts for all
  to service_role
  using (true)
  with check (true);

-- 2. red_team_scans table policies
drop policy if exists "System manages scan lifecycle" on red_team_scans;
create policy "System manages scan lifecycle"
  on red_team_scans for insert
  to service_role
  with check (true);

drop policy if exists "System updates scan results" on red_team_scans;
create policy "System updates scan results"
  on red_team_scans for update
  to service_role
  using (true)
  with check (true);

-- 3. pentest_reports table policies
drop policy if exists "System can insert reports" on pentest_reports;
create policy "System can insert reports"
  on pentest_reports for insert
  to service_role
  with check (true);

-- 4. notifications table policies
drop policy if exists "System can insert notifications" on notifications;
create policy "System can insert notifications"
  on notifications for insert
  to service_role
  with check (true);

-- 5. code_scans table policies
drop policy if exists "System manages scan lifecycle" on code_scans;
create policy "System manages scan lifecycle"
  on code_scans for insert
  to service_role
  with check (true);

drop policy if exists "System updates scan results" on code_scans;
create policy "System updates scan results"
  on code_scans for update
  to service_role
  using (true)
  with check (true);
