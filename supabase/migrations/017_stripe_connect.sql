-- ============================================================
-- VAULTX — Migration 017: Stripe Connect Payouts (Core)
-- ============================================================
-- Deliberately additive-only. Does NOT touch the `reward_status` enum
-- or the `enforce_human_reward_approval` trigger from migration 001 —
-- Stripe transfers are only ever attempted on rewards that already
-- have status='approved' with a non-null approved_by (human), enforced
-- at the application layer in app/actions/rewards.ts and structurally
-- guaranteed by that existing trigger regardless. This migration adds
-- a parallel, more granular *payout* substate (`payout_status`) that
-- tracks the Stripe transfer lifecycle without redefining what
-- "approved" or "paid" mean to the rest of the platform.

-- ── Researcher-side: Stripe Connect Express account ────────────────────────
alter table profiles
  add column stripe_account_id         text,
  add column stripe_onboarding_complete boolean not null default false,
  add column stripe_payouts_enabled     boolean not null default false;

create unique index profiles_stripe_account_id_idx
  on profiles(stripe_account_id) where stripe_account_id is not null;

-- ── Reward-side: payout lifecycle tracking ─────────────────────────────────
alter table rewards
  add column payout_status        text not null default 'not_started'
    check (payout_status in ('not_started', 'processing', 'succeeded', 'failed')),
  add column stripe_transfer_id   text,
  add column payout_failure_reason text,
  add column payout_retry_count   integer not null default 0;

create index rewards_payout_status_idx on rewards(payout_status);

comment on column rewards.payout_status is
  'Stripe transfer lifecycle, distinct from rewards.status. A reward can be status=approved with payout_status=failed (retry needed) — status only flips to paid once payout_status reaches succeeded.';
