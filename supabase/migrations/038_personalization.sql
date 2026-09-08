-- =============================================================================
-- VAULTX: 038_personalization.sql
-- AI-Native Website Copilot: Personalization & Behavioral Intelligence Layer
-- =============================================================================

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: user_behavior_events (Zero-cost client telemetry / event stream)
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'action_taken', 'search', 'dismiss_suggestion')),
  capability_key TEXT REFERENCES public.capability_registry(key) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast user aggregation queries
CREATE INDEX IF NOT EXISTS idx_behavior_events_user_created ON public.user_behavior_events (user_id, created_at DESC);

-- Table: personalization_profiles (Derived behavioral models + embeddings)
CREATE TABLE IF NOT EXISTS public.personalization_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_capabilities JSONB DEFAULT '[]'::jsonb,
  role_context JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add AI Personalization toggle to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_personalization_opt_in BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_behavior_events
DROP POLICY IF EXISTS "Users can insert their own behavior events" ON public.user_behavior_events;
CREATE POLICY "Users can insert their own behavior events"
  ON public.user_behavior_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own behavior events" ON public.user_behavior_events;
CREATE POLICY "Users can view their own behavior events"
  ON public.user_behavior_events FOR SELECT
  USING (auth.uid() = user_id);

-- Policies for personalization_profiles
DROP POLICY IF EXISTS "Users can view their own personalization profile" ON public.personalization_profiles;
CREATE POLICY "Users can view their own personalization profile"
  ON public.personalization_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own personalization profile" ON public.personalization_profiles;
CREATE POLICY "Users can update their own personalization profile"
  ON public.personalization_profiles FOR ALL
  USING (auth.uid() = user_id);
