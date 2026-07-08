-- ============================================================
-- VAULTX — Migration 021: VAULT Agent Mode (First Slice)
-- ============================================================
-- Tracks every action VAULT proposes and whether/how it was executed.
-- This table IS the audit trail for proposals (what was suggested,
-- to whom, when) — actual execution still writes to the platform's
-- existing audit_logs table too (with after.via = 'vault_agent'), so
-- executed actions are visible in both the agent-specific view here
-- and the platform-wide audit log admins already use.

create table vault_actions (
  id              uuid        primary key default uuid_generate_v4(),
  conversation_id uuid        references vault_conversations(id) on delete set null,
  user_id         uuid        not null references profiles(id) on delete cascade,
  action_type     text        not null, -- e.g. 'trigger_code_scan', 'generate_ptaas_report'
  params          jsonb       not null default '{}',
  summary         text        not null, -- human-readable description shown in the Action Preview card
  status          text        not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'executed', 'failed', 'cancelled')),
  result          jsonb,      -- populated on success (e.g. scan id, report filename)
  error           text,       -- populated on failure
  created_at      timestamptz not null default now(),
  executed_at     timestamptz
);

create index vault_actions_user_id_idx on vault_actions(user_id);
create index vault_actions_status_idx  on vault_actions(status);

alter table vault_actions enable row level security;

create policy "Users manage their own VAULT actions"
  on vault_actions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
