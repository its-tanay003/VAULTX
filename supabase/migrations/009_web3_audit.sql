-- ============================================================
-- VAULTX — Migration 009: Web3 Smart Contract Audits
--
-- Design note: this reuses the EXISTING code_repos/code_scans tables
-- from Week 6 rather than creating parallel infrastructure. A Web3
-- audit is just a different *kind* of scan against the same connected
-- repo — same provenance, same RLS, same history list. The only schema
-- change needed is a scan_type discriminator.
-- ============================================================

alter table code_scans
  add column scan_type text not null default 'general'
  check (scan_type in ('general', 'web3_smart_contract'));

create index code_scans_repo_type_idx on code_scans(repo_id, scan_type);
