-- =============================================================================
-- VAULTX: 034_review_sessions.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES public.code_scans(id) ON DELETE SET NULL,
    last_viewed_file TEXT,
    cursor_line INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, repo_id)
);

-- Enable RLS
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own review sessions" ON public.review_sessions;
CREATE POLICY "Users can manage their own review sessions"
    ON public.review_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
