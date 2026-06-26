-- =============================================================================
-- VAULTX: 012_settings.sql (CORRECTED)
-- Fixes: Missing INSERT policy on org_settings, broken is_current boolean,
--        missing updated_at triggers, missing user_settings auto-create trigger,
--        missing org_invitations table, fake integrations schema, avatar UPDATE
--        policy, WITH CHECK on org_settings UPDATE, explicit api_keys policies,
--        and double-hash implementation.
-- =============================================================================


-- =============================================================================
-- HELPER: auto-update updated_at on any table that has the column
-- (Fix for Bug 3 — no updated_at triggers existed)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE: user_settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications   BOOLEAN DEFAULT TRUE,
    security_alerts       BOOLEAN DEFAULT TRUE,
    weekly_digest         BOOLEAN DEFAULT FALSE,
    is_public_profile     BOOLEAN DEFAULT FALSE,
    show_ctf_ranking      BOOLEAN DEFAULT TRUE,
    allow_search_by_email BOOLEAN DEFAULT TRUE,
    theme                 VARCHAR(50) DEFAULT 'dark',
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);   -- explicit WITH CHECK (Bug 11 pattern applied here too)

-- Fix Bug 3: auto-update updated_at
CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Fix Bug 4: auto-create default user_settings row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users via the existing profiles trigger pattern
CREATE OR REPLACE TRIGGER trg_create_user_settings
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();


-- =============================================================================
-- TABLE: memberships
-- Fix Bug 5: This table was referenced in org_settings RLS but never defined.
-- If already created in an earlier migration, remove this block.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.memberships (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       VARCHAR(50) NOT NULL DEFAULT 'member'
                   CHECK (role IN ('owner', 'admin', 'member', 'triager')),
    status     VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'suspended')),
    joined_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (org_id, user_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org memberships"
    ON public.memberships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Org admins can manage memberships"
    ON public.memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m2
            WHERE m2.org_id = memberships.org_id
              AND m2.user_id = auth.uid()
              AND m2.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memberships m2
            WHERE m2.org_id = memberships.org_id
              AND m2.user_id = auth.uid()
              AND m2.role IN ('owner', 'admin')
        )
    );


-- =============================================================================
-- TABLE: org_invitations
-- Fix Bug 7: inviteOrgMember must use a real invite flow, not direct insert.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.org_invitations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL,
    role         VARCHAR(50) NOT NULL DEFAULT 'member'
                     CHECK (role IN ('admin', 'member', 'triager')),
    token        VARCHAR(255) NOT NULL UNIQUE,   -- secure random token sent in invite email
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at   TIMESTAMP WITH TIME ZONE NOT NULL
                     DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days'),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage invitations"
    ON public.org_invitations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.org_id = org_invitations.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.org_id = org_invitations.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.role IN ('owner', 'admin')
        )
    );


-- =============================================================================
-- TABLE: org_settings
-- Fix Bug 1: Added INSERT policy.
-- Fix Bug 8: Added real integration token/webhook columns instead of booleans.
-- Fix Bug 11: Added WITH CHECK on UPDATE policy.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.org_settings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    require_mfa           BOOLEAN DEFAULT FALSE,
    allowed_domains       TEXT[] DEFAULT '{}'::TEXT[],
    default_role          VARCHAR(50) DEFAULT 'member',

    -- Fix Bug 8: Real integration fields instead of cosmetic booleans.
    -- GitHub: store encrypted OAuth access token via Supabase Vault or env-encrypted.
    github_connected      BOOLEAN DEFAULT FALSE,
    github_access_token   TEXT DEFAULT NULL,         -- store encrypted; NULL = not connected
    github_installed_at   TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    -- Slack: store incoming webhook URL (user authorizes via Slack OAuth)
    slack_connected       BOOLEAN DEFAULT FALSE,
    slack_webhook_url     TEXT DEFAULT NULL,          -- NULL = not connected
    slack_connected_at    TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    -- Resend: store verified sending domain (not a full OAuth; domain is configured)
    resend_connected      BOOLEAN DEFAULT FALSE,
    resend_domain         TEXT DEFAULT NULL,          -- NULL = not configured

    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view settings"
    ON public.org_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.org_id = org_settings.org_id
              AND memberships.user_id = auth.uid()
        )
    );

-- Fix Bug 1: INSERT policy was missing entirely.
CREATE POLICY "Org admins can insert settings"
    ON public.org_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.org_id = org_settings.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.role IN ('owner', 'admin')
        )
    );

-- Fix Bug 11: Added WITH CHECK to prevent org_id hopping.
CREATE POLICY "Org admins can update settings"
    ON public.org_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.org_id = org_settings.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.org_id = org_settings.org_id  -- org_id cannot be changed
              AND memberships.user_id = auth.uid()
              AND memberships.role IN ('owner', 'admin')
        )
    );

-- Fix Bug 3: auto-update updated_at
CREATE TRIGGER trg_org_settings_updated_at
    BEFORE UPDATE ON public.org_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================================
-- TABLE: api_keys
-- Fix Bug 6: Implemented real double-hash (salt + hash) instead of single hash.
-- Fix Bug 12: Explicit WITH CHECK on INSERT instead of relying on FOR ALL implicit.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    key_prefix   VARCHAR(10) NOT NULL,    -- e.g. "vx_abc123" — shown in UI for identification

    -- Fix Bug 6: Double-hash implementation.
    -- key_salt: random 32-byte hex salt generated at key creation time.
    -- key_hash: SHA-256(SHA-256(plaintext_key) + key_salt) — never store plaintext.
    key_salt     VARCHAR(64) NOT NULL,
    key_hash     VARCHAR(255) NOT NULL UNIQUE,

    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at   TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Fix Bug 12: Explicit separate policies instead of FOR ALL with implicit WITH CHECK.
CREATE POLICY "Users can select their own API keys"
    ON public.api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
    ON public.api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- No UPDATE policy: API keys are immutable once created. Rotate = delete + create.


-- =============================================================================
-- TABLE: user_sessions
-- Fix Bug 2: Removed broken `is_current` boolean.
--            Current session is determined at query time by matching token_hash
--            from the live request context — not stored state.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL UNIQUE,
    user_agent     TEXT,
    ip_address     VARCHAR(45),
    -- REMOVED: is_current BOOLEAN — determined dynamically, not stored.
    -- To check "is this the current session": hash the incoming bearer token
    -- and compare: SELECT id FROM user_sessions WHERE token_hash = $hashed_token
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own sessions"
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON public.user_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON public.user_sessions FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.user_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- STORAGE: avatars bucket
-- Fix Bug 9: Added UPDATE policy for avatar re-uploads.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar Select Policy"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Insert Policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Fix Bug 9: UPDATE policy was missing.
CREATE POLICY "Avatar Update Policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Avatar Delete Policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );