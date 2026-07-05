-- ============================================================
-- VAULTX — Migration 018: Stripe Connect Payouts (Batch 2)
-- ============================================================
-- Additive only, same convention as 017. Nothing here touches the
-- reward_status enum or the human-approval trigger.

-- ── Payout splitting: multiple researchers on one reward ───────────────────
-- A reward keeps its single researcher_id as "primary submitter" for
-- backward compatibility (existing queries, leaderboards, etc. keep
-- working unmodified). If reward_splits rows exist for a reward, the
-- payout flow pays each split recipient their share instead of paying
-- the full amount to researcher_id alone.
create table reward_splits (
  id            uuid          primary key default uuid_generate_v4(),
  reward_id     uuid          not null references rewards(id) on delete cascade,
  researcher_id uuid          not null references profiles(id) on delete restrict,
  share_percent numeric(5,2)  not null check (share_percent > 0 and share_percent <= 100),
  amount        integer,      -- computed and frozen at payout time, null until then
  stripe_transfer_id    text,
  payout_status text          not null default 'not_started'
    check (payout_status in ('not_started', 'processing', 'succeeded', 'failed')),
  payout_failure_reason text,
  created_at    timestamptz   not null default now(),

  unique (reward_id, researcher_id)
);

create index reward_splits_reward_id_idx on reward_splits(reward_id);

alter table reward_splits enable row level security;

create policy "Org owners view splits for their rewards"
  on reward_splits for select
  using (
    reward_id in (
      select id from rewards where org_id in (
        select id from organizations where owner_id = auth.uid()
      )
    )
  );

create policy "Researchers view their own splits"
  on reward_splits for select
  using (researcher_id = auth.uid());

-- ── Minimum payout threshold ────────────────────────────────────────────────
alter table profiles
  add column minimum_payout_threshold integer not null default 50; -- whole currency units, matches rewards.amount convention

alter table rewards
  add column held_for_threshold boolean not null default false;

comment on column rewards.held_for_threshold is
  'True when this approved reward is being held because the researcher''s cumulative unpaid approved total hasn''t yet reached their minimum_payout_threshold. Org can still see it as approved; the payout action groups all held rewards into one transfer once the threshold is crossed.';

-- ── Fraud detection flags ────────────────────────────────────────────────────
-- Populated by real signals (e.g. Stripe external-account bank fingerprint
-- collisions across researcher profiles), not a fabricated ML model. See
-- lib/stripe/fraud.ts.
create table payout_fraud_flags (
  id            uuid        primary key default uuid_generate_v4(),
  researcher_id uuid        not null references profiles(id) on delete cascade,
  flag_type     text        not null, -- e.g. 'duplicate_bank_account'
  detail        jsonb       not null default '{}',
  resolved      boolean     not null default false,
  resolved_by   uuid        references profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index payout_fraud_flags_researcher_id_idx on payout_fraud_flags(researcher_id);
create index payout_fraud_flags_unresolved_idx on payout_fraud_flags(resolved) where resolved = false;
