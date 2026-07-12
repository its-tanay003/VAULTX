-- =============================================================================
-- VAULTX — Migration 032: Per-org Custom Limit Overrides
-- =============================================================================
-- Adds a limit_overrides jsonb column to organizations so that enterprise
-- customers can be given negotiated limits without a new plan row.
--
-- Design: getOrgLimits() checks this column first. Any key present here
-- wins over the plan default; missing keys fall back to the plan. This
-- means an override of {"seats": 50} only changes seat count and leaves
-- every other limit at the plan's value.
--
-- Write path: only the service role (admin API / support tooling) should
-- update this column. No authenticated user or RLS policy allows it.
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN limit_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.limit_overrides IS
  'Enterprise per-org limit overrides. Keys match PlanLimits fields. '
  'Values here take priority over the plan limits in getOrgLimits(). '
  'Only writable by the service role.';
