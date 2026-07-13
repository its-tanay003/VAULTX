-- =============================================================================
-- VAULTX: 033_settings_expansion.sql
-- =============================================================================

-- Add settings columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vault_response_style VARCHAR(20) DEFAULT 'concise' CHECK (vault_response_style IN ('concise', 'detailed')),
ADD COLUMN IF NOT EXISTS ai_training_opt_in BOOLEAN DEFAULT false;

-- Create public.active_sessions table
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_label TEXT NOT NULL,
    ip TEXT NOT NULL,
    user_agent TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on active_sessions
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own active sessions" ON public.active_sessions;
CREATE POLICY "Users can select their own active sessions"
    ON public.active_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own active sessions" ON public.active_sessions;
CREATE POLICY "Users can insert their own active sessions"
    ON public.active_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own active sessions" ON public.active_sessions;
CREATE POLICY "Users can update their own active sessions"
    ON public.active_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own active sessions" ON public.active_sessions;
CREATE POLICY "Users can delete their own active sessions"
    ON public.active_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Create data_export_status ENUM if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_export_status') THEN
    CREATE TYPE data_export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END$$;

-- Create public.data_export_requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.data_export_status NOT NULL DEFAULT 'pending',
    file_url TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on data_export_requests
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own export requests" ON public.data_export_requests;
CREATE POLICY "Users can select their own export requests"
    ON public.data_export_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own export requests" ON public.data_export_requests;
CREATE POLICY "Users can insert their own export requests"
    ON public.data_export_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own export requests" ON public.data_export_requests;
CREATE POLICY "Users can update their own export requests"
    ON public.data_export_requests FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own export requests" ON public.data_export_requests;
CREATE POLICY "Users can delete their own export requests"
    ON public.data_export_requests FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- SESSION SYNC MECHANISM (auth.sessions -> public.active_sessions)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_auth_session_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.active_sessions (id, user_id, device_label, ip, user_agent, created_at, last_active_at)
    VALUES (
      NEW.id,
      NEW.user_id,
      COALESCE(NEW.user_agent, 'Unknown Device'),
      COALESCE(NEW.ip, '0.0.0.0'),
      NEW.user_agent,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE
    SET ip = EXCLUDED.ip,
        user_agent = EXCLUDED.user_agent,
        last_active_at = EXCLUDED.last_active_at;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.active_sessions
    SET ip = NEW.ip,
        user_agent = NEW.user_agent,
        last_active_at = NEW.updated_at
    WHERE id = NEW.id;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.active_sessions WHERE id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth.sessions into public.active_sessions
DROP TRIGGER IF EXISTS trg_auth_session_sync ON auth.sessions;
CREATE TRIGGER trg_auth_session_sync
AFTER INSERT OR UPDATE OR DELETE ON auth.sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_session_sync();

-- =============================================================================
-- FUNCTION: revoke_user_session (Security Definer RPC)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.revoke_user_session(session_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify that the session belongs to the calling user (or they are an admin)
  -- Since it is SECURITY DEFINER, it runs with high privileges, so we must check auth.uid()
  IF EXISTS (
    SELECT 1 FROM auth.sessions
    WHERE id = session_id AND user_id = auth.uid()
  ) THEN
    DELETE FROM auth.sessions WHERE id = session_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized or session not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
