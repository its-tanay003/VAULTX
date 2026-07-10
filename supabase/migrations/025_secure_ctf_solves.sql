-- ============================================================
-- VAULTX — Migration 025: Secure CTF Solves RLS & Insertion
-- ============================================================

-- 1. Restrict direct insertions to service role only
drop policy if exists "System inserts solves" on ctf_solves;

create policy "System inserts solves"
  on ctf_solves for insert
  to service_role
  with check (true);
