-- =============================================================================
-- VAULTX: 035_workspaces.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
    branch TEXT NOT NULL DEFAULT 'main',
    status TEXT NOT NULL CHECK (status IN ('provisioning', 'active', 'suspended', 'destroyed')) DEFAULT 'provisioning',
    sandbox_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own workspaces" ON public.workspaces;
CREATE POLICY "Users can manage their own workspaces"
    ON public.workspaces FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
