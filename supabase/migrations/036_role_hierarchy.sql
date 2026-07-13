-- =============================================================================
-- VAULTX: 036_role_hierarchy.sql
-- =============================================================================

-- Create 7-tier RBAC enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_rbac_role') THEN
    CREATE TYPE user_rbac_role AS ENUM (
      'guest',
      'researcher',
      'triager',
      'developer',
      'maintainer',
      'org_owner',
      'system_admin'
    );
  END IF;
END$$;

-- Add rbac_role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rbac_role user_rbac_role;

-- Populate column based on backward-compatible mappings
UPDATE public.profiles
SET rbac_role = CASE
  WHEN role = 'admin' THEN 'system_admin'::user_rbac_role
  WHEN role = 'org' THEN 'org_owner'::user_rbac_role
  WHEN role = 'triager' THEN 'triager'::user_rbac_role
  WHEN role = 'researcher' THEN 'researcher'::user_rbac_role
  ELSE 'guest'::user_rbac_role
END
WHERE rbac_role IS NULL;

-- Make rbac_role NOT NULL
ALTER TABLE public.profiles ALTER COLUMN rbac_role SET NOT NULL;

-- Helper function to check minimum role hierarchy level
CREATE OR REPLACE FUNCTION public.role_at_least(user_id UUID, required_role user_rbac_role)
RETURNS BOOLEAN SECURITY DEFINER AS $$
DECLARE
  user_role user_rbac_role;
BEGIN
  SELECT rbac_role INTO user_role FROM public.profiles WHERE id = user_id;
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN user_role >= required_role;
END;
$$ LANGUAGE plpgsql;

-- Create AI Telemetry Logs Table
CREATE TABLE IF NOT EXISTS public.ai_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI logs" ON public.ai_call_logs;
CREATE POLICY "Users can view their own AI logs"
    ON public.ai_call_logs FOR SELECT
    USING (auth.uid() = user_id);
