-- ============================================================
-- VAULTX — Migration 020: VAULT AI Agent
-- ============================================================

create table vault_conversations (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  title      text,       -- first user message, truncated, for a session list
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vault_messages (
  id              uuid        primary key default uuid_generate_v4(),
  conversation_id uuid        not null references vault_conversations(id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  context         jsonb,      -- snapshot of what page/entity was being viewed when this message was sent
  created_at      timestamptz not null default now()
);

create index vault_conversations_user_id_idx on vault_conversations(user_id);
create index vault_messages_conversation_id_idx on vault_messages(conversation_id);

alter table vault_conversations enable row level security;
alter table vault_messages enable row level security;

create policy "Users manage their own VAULT conversations"
  on vault_conversations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage messages in their own VAULT conversations"
  on vault_messages for all
  using (conversation_id in (select id from vault_conversations where user_id = auth.uid()))
  with check (conversation_id in (select id from vault_conversations where user_id = auth.uid()));
