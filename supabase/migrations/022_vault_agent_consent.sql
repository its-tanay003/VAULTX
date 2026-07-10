-- ============================================================
-- VAULTX — Migration 022: VAULT Agent Mode — Consent & Toggle
-- ============================================================
-- Per the design doc §9: a durable, re-visitable setting rather than a
-- recurring dialog. Defaults to enabled (Agent Mode ships as part of
-- VAULT), but any user can turn it off entirely — when off, VAULT
-- never emits or offers an action block, Chat Mode continues to work
-- exactly as before.

alter table profiles
  add column vault_agent_mode_enabled boolean not null default true,
  add column vault_agent_consent_at   timestamptz; -- set once, on first action confirmation
