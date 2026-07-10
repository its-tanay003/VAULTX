-- =============================================================================
-- VAULTX — Migration 026: Align Org Membership Models (Single Source of Truth)
-- =============================================================================

-- 1. Sync any missing profiles.org_id records into memberships table
-- Ensures memberships contains all existing organization associations.
INSERT INTO public.memberships (org_id, user_id, role, status)
SELECT org_id, id, LOWER(role::text), 'active'
FROM public.profiles
WHERE org_id IS NOT NULL
  AND role IN ('org', 'triager')
ON CONFLICT (org_id, user_id) DO UPDATE 
SET role = EXCLUDED.role;

-- 2. Sync any missing memberships records back to profiles.org_id
-- Ensures profiles.org_id matches for legacy check compatibility.
UPDATE public.profiles p
SET org_id = m.org_id
FROM public.memberships m
WHERE p.id = m.user_id
  AND p.org_id IS DISTINCT FROM m.org_id;

-- 3. Create a trigger function to keep profiles.org_id and memberships synchronized automatically
CREATE OR REPLACE FUNCTION public.sync_profile_org_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Sync memberships changes -> profiles
    UPDATE public.profiles
    SET org_id = NEW.org_id
    WHERE id = NEW.user_id AND org_id IS DISTINCT FROM NEW.org_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Sync memberships deletion -> profiles
    UPDATE public.profiles
    SET org_id = NULL
    WHERE id = OLD.user_id AND org_id = OLD.org_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_membership_to_profile
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_org_membership();

-- 4. Create a trigger function to sync profiles updates -> memberships automatically
CREATE OR REPLACE FUNCTION public.sync_profile_to_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NOT NULL THEN
    INSERT INTO public.memberships (org_id, user_id, role, status)
    VALUES (NEW.org_id, NEW.id, LOWER(NEW.role::text), 'active')
    ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = LOWER(EXCLUDED.role);
  ELSE
    -- If user set org_id to null, remove active memberships
    DELETE FROM public.memberships
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_profile_to_membership
  AFTER UPDATE OF org_id OR INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_membership();

-- 5. Align RLS policies: Rewrite check_user_is_org_member to check BOTH tables natively
CREATE OR REPLACE FUNCTION public.check_user_is_org_member(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organizations WHERE id = org_id AND owner_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND profiles.org_id = check_user_is_org_member.org_id
  ) OR EXISTS (
    SELECT 1 FROM public.memberships WHERE user_id = check_user_is_org_member.user_id AND memberships.org_id = check_user_is_org_member.org_id
  );
END;
$$;
