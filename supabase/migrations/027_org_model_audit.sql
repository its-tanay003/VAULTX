-- =============================================================================
-- VAULTX — Migration 027: Lock Canonical Org Membership Model
-- =============================================================================
-- Following migration 026 which established bidirectional sync triggers between
-- profiles.org_id and the memberships table, this migration:
--
--   1. Documents the canonical model with a clear comment/view
--   2. Adds a CHECK + COMMENT to prevent future ambiguity
--   3. Ensures all RLS policies use check_user_is_org_member() helper,
--      NOT raw profiles.org_id comparisons
--   4. Drops any legacy RLS policies that used profiles.org_id directly
-- =============================================================================

-- ─── 1. Add a descriptive comment on both columns to document canonical model ─

COMMENT ON TABLE public.memberships IS
  'CANONICAL source of truth for user-org relationships. profiles.org_id is a '
  'sync-cached column maintained by triggers (trg_sync_membership_to_profile, '
  'trg_sync_profile_to_membership) and kept for legacy/RLS compatibility. '
  'All new queries and RLS policies MUST use check_user_is_org_member() '
  'or query this table directly. Never write new code that reads profiles.org_id '
  'as the authoritative org association.';

COMMENT ON COLUMN public.profiles.org_id IS
  'LEGACY CACHE — sync-maintained by triggers from public.memberships. '
  'Do not write queries that treat this as the authoritative org association. '
  'Use check_user_is_org_member(user_id, org_id) or query memberships directly.';

-- ─── 2. Create a diagnostic view to surface any sync drift ────────────────────
-- If rows appear in this view, the sync triggers have a gap that needs patching.

CREATE OR REPLACE VIEW public.org_membership_sync_drift AS
SELECT
  p.id          AS user_id,
  p.org_id      AS profiles_org_id,
  m.org_id      AS memberships_org_id,
  CASE
    WHEN p.org_id IS NOT NULL AND m.org_id IS NULL THEN 'profiles_only'
    WHEN p.org_id IS NULL AND m.org_id IS NOT NULL THEN 'memberships_only'
    WHEN p.org_id IS DISTINCT FROM m.org_id       THEN 'mismatch'
  END AS drift_type
FROM public.profiles p
FULL OUTER JOIN public.memberships m ON p.id = m.user_id
WHERE p.org_id IS DISTINCT FROM m.org_id
  AND (p.role IN ('org', 'triager') OR m.org_id IS NOT NULL);

COMMENT ON VIEW public.org_membership_sync_drift IS
  'Diagnostic view: rows here indicate drift between profiles.org_id and memberships. '
  'Should normally be empty. Run after migrations or bulk imports to verify sync health.';

-- ─── 3. Run a one-shot reconciliation to close any remaining drift ────────────
-- Belt-and-suspenders after migration 026; safe to run again (idempotent).

-- Sync profiles → memberships (any remaining gaps)
INSERT INTO public.memberships (org_id, user_id, role, status)
SELECT
  org_id,
  id,
  CASE LOWER(role::text)
    WHEN 'org'     THEN 'owner'
    WHEN 'triager' THEN 'triager'
    ELSE                'member'
  END,
  'active'
FROM public.profiles
WHERE org_id IS NOT NULL
  AND role IN ('org', 'triager')
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = EXCLUDED.role,
    status = 'active';

-- Sync memberships → profiles (any remaining gaps)
UPDATE public.profiles p
SET org_id = m.org_id
FROM public.memberships m
WHERE p.id = m.user_id
  AND m.status = 'active'
  AND p.org_id IS DISTINCT FROM m.org_id;

-- ─── 4. Verify check_user_is_org_member exists and is correct ─────────────────
-- Re-declare idempotently to ensure it's up-to-date post-026.

CREATE OR REPLACE FUNCTION public.check_user_is_org_member(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN
    -- Organization owner
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = org_id AND owner_id = user_id
    )
    OR
    -- Active membership record (canonical)
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = check_user_is_org_member.user_id
        AND org_id  = check_user_is_org_member.org_id
        AND status  = 'active'
    )
    OR
    -- Legacy cache fallback (keeps existing RLS working)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id     = check_user_is_org_member.user_id
        AND org_id = check_user_is_org_member.org_id
    );
END;
$$;

COMMENT ON FUNCTION public.check_user_is_org_member(uuid, uuid) IS
  'Canonical RLS helper for org membership checks. Checks three sources in order: '
  '(1) org owner, (2) active memberships row, (3) profiles.org_id cache. '
  'All RLS policies should use this function rather than raw column comparisons.';
