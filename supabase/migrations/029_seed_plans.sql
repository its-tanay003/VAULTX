-- =============================================================================
-- VAULTX — Migration 029: Seed Subscription Plans & Limits Matrix
-- =============================================================================
-- Seeds the initial subscription plans table with default pricing and
-- capability quotas defined in the platform's billing architecture specifications.
-- Supports idempotent re-runs using ON CONFLICT logic.
-- =============================================================================

INSERT INTO public.plans (name, monthly_price_cents, yearly_price_cents, stripe_price_id_monthly, stripe_price_id_yearly, limits)
VALUES
  (
    'Free',
    0,
    0,
    NULL,
    NULL,
    '{
      "seats": 1,
      "active_programs": 1,
      "red_team_runs_monthly": 1,
      "audit_contest_submissions": 0,
      "private_repos_scanned": 0,
      "ai_triage_requests_monthly": 5,
      "max_pdf_reports_monthly": 1,
      "ptaas_concurrent_engagements": 0,
      "ctf_active": 0,
      "contests_active": 0
    }'::jsonb
  ),
  (
    'Pro',
    4900,
    47000,
    'price_placeholder_pro_monthly',
    'price_placeholder_pro_yearly',
    '{
      "seats": 5,
      "active_programs": 5,
      "red_team_runs_monthly": 10,
      "audit_contest_submissions": 5,
      "private_repos_scanned": 3,
      "ai_triage_requests_monthly": 100,
      "max_pdf_reports_monthly": 10,
      "ptaas_concurrent_engagements": 1,
      "ctf_active": 1,
      "contests_active": 1
    }'::jsonb
  ),
  (
    'Max',
    19900,
    191000,
    'price_placeholder_max_monthly',
    'price_placeholder_max_yearly',
    '{
      "seats": 20,
      "active_programs": 20,
      "red_team_runs_monthly": 50,
      "audit_contest_submissions": 20,
      "private_repos_scanned": 10,
      "ai_triage_requests_monthly": 500,
      "max_pdf_reports_monthly": 50,
      "ptaas_concurrent_engagements": 5,
      "ctf_active": 5,
      "contests_active": 5
    }'::jsonb
  ),
  (
    'Pro Max',
    49900,
    479000,
    'price_placeholder_promax_monthly',
    'price_placeholder_promax_yearly',
    '{
      "seats": 999999,
      "active_programs": 999999,
      "red_team_runs_monthly": 999999,
      "audit_contest_submissions": 999999,
      "private_repos_scanned": 999999,
      "ai_triage_requests_monthly": 999999,
      "max_pdf_reports_monthly": 999999,
      "ptaas_concurrent_engagements": 999999,
      "ctf_active": 999999,
      "contests_active": 999999
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE
SET monthly_price_cents = EXCLUDED.monthly_price_cents,
    yearly_price_cents = EXCLUDED.yearly_price_cents,
    limits = EXCLUDED.limits;
