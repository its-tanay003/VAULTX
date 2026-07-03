# VAULTX Settings System Documentation

This document provides a comprehensive overview of the **Settings System** implemented in VAULTX.

---

## 🛠️ System Overview

The Settings System is a complete, production-grade configuration hub for both individual security researchers and organization tenants. It supports secure profile updates, profile picture uploads via Supabase Storage, multi-session management, API key generation, active integrations toggling, notification preferences, privacy visibility toggles, organization management (inviting members), and account deletion/lifecycles.

### Architecture Highlights
- **Framework**: Next.js 14 App Router with fully typed React Server Actions for form submissions.
- **State Management & UI**: Tailwind CSS styled components with responsive sidebar navigation and Framer Motion micro-animations.
- **Database Backend**: PostgreSQL with row-level security (RLS) constraints on `user_settings`, `org_settings`, `api_keys`, and `user_sessions`.
- **Storage**: Supabase Storage public bucket (`avatars`) with policies restricted to authenticated user uploads.
- **Security**: Double-wrapped cryptographic hashes for API keys, strict session invalidation, and RLS constraint compliance.

---

## 📂 File Structure & Layout

The system comprises 18 new files structured as follows:

```
vaultx/
├── app/
│   ├── actions/
│   │   └── settings.ts                         # 12 Server Actions for all configuration forms
│   └── (dashboard)/dashboard/settings/
│       ├── layout.tsx                          # Shared Settings sidebar shell
│       ├── page.tsx                            # Router redirect (/settings -> /settings/profile)
│       ├── profile/page.tsx                    # Profile configuration and avatar upload
│       ├── security/page.tsx                   # Password changes & active session management
│       ├── notifications/page.tsx              # Email, push, and digest alert toggles
│       ├── privacy/page.tsx                    # Visibility, searchability, and history logs
│       ├── integrations/page.tsx               # API connections (GitHub, Resend, Slack)
│       ├── api-keys/page.tsx                   # Live API Key generation and management
│       ├── organization/page.tsx               # Organization members, roles, and settings
│       └── danger/page.tsx                     # Account deletion and factory resets
├── components/
│   └── settings/
│       ├── settings-nav.tsx                    # Sidebar settings navigation links
│       ├── section-card.tsx                    # UI shells (SectionCard, FieldRow, SettingsToggle)
│       ├── danger-confirm-dialog.tsx           # Overlay verification modal for destructive actions
│       ├── api-key-table.tsx                   # Active API key listing, revocation, and copying
│       ├── integration-tile.tsx                # Status tile for external provider connection
│       └── session-list.tsx                    # User active session list with revocation control
└── supabase/migrations/
    └── 012_settings.sql                        # Database schema, storage setup, and RLS rules
```

---

## 💾 Database Schema (`012_settings.sql`)

Below is the database representation. If you have not applied this migration yet, copy this schema and run it inside your [Supabase SQL Editor](https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new):

```sql
-- Create User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    weekly_digest BOOLEAN DEFAULT FALSE,
    is_public_profile BOOLEAN DEFAULT FALSE,
    show_ctf_ranking BOOLEAN DEFAULT TRUE,
    allow_search_by_email BOOLEAN DEFAULT TRUE,
    theme VARCHAR(50) DEFAULT 'dark',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" 
    ON public.user_settings FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own settings" 
    ON public.user_settings FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own settings" 
    ON public.user_settings FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create Organization Settings Table
CREATE TABLE IF NOT EXISTS public.org_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    require_mfa BOOLEAN DEFAULT FALSE,
    allowed_domains TEXT[] DEFAULT '{}'::TEXT[],
    default_role VARCHAR(50) DEFAULT 'member',
    github_connected BOOLEAN DEFAULT FALSE,
    resend_connected BOOLEAN DEFAULT FALSE,
    slack_connected BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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

CREATE POLICY "Org admins can update settings" 
    ON public.org_settings FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships 
            WHERE memberships.org_id = org_settings.org_id 
            AND memberships.user_id = auth.uid() 
            AND memberships.role IN ('owner', 'admin')
        )
    );

-- Create API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys" 
    ON public.api_keys FOR ALL 
    USING (auth.uid() = user_id);

-- Create User Sessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions" 
    ON public.user_sessions FOR ALL 
    USING (auth.uid() = user_id);

-- Storage bucket configuration for Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for Avatars storage
CREATE POLICY "Avatar Select Policy" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Insert Policy" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar Delete Policy" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## ⚡ Server Actions (`app/actions/settings.ts`)

Twelve fully typed React Server Actions power the backend operations:

1. **`updateProfile(formData: FormData)`**: Modifies user profile attributes (display name, website, bio, avatar URL) inside `public.profiles`.
2. **`changePassword(password: string)`**: Securely modifies user credentials via `supabase.auth.updateUser()`.
3. **`updateNotificationSettings(settings)`**: Upserts preferences inside `public.user_settings` (email notification toggle, digest frequency, alert flags).
4. **`updatePrivacySettings(settings)`**: Modifies public profile visibility, ranking listings, and search settings in `public.user_settings`.
5. **`createApiKey(name: string)`**: Generates an API key (e.g. `vx_...`), registers the prefix, hashes the secret value, and persists it. Returns the plaintext secret key exactly once.
6. **`revokeApiKey(keyId: string)`**: Deletes a generated API key immediately.
7. **`revokeSession(sessionId: string)`**: Terminates active devices and remote sessions.
8. **`connectIntegration(provider: string)`**: Connects external integrations (GitHub, Slack, Resend) by setting active states.
9. **`disconnectIntegration(provider: string)`**: Resets connections to default states.
10. **`updateOrgSettings(settings)`**: Sets tenant domain restrictions, default membership privileges, and MFA mandates on `public.org_settings`.
11. **`inviteOrgMember(email: string, role: string)`**: Registers invitations to join organizations inside `public.memberships`.
12. **`deleteAccountConfirm()`**: Initiates full user deletion and wipes associated database rows safely.

---

## 🖥️ UI Page Routes & Components

All pages feature consistent high-fidelity aesthetics using card layouts (`vault-card`), state controls, loading spinners, and clear messaging.

### 👤 Profile Settings (`/settings/profile`)
- **Profile Picture Upload**: Integrates with the Supabase `avatars` bucket. Restricts files to PNG/JPG/GIF and crops them within standard boundaries.
- **Server Metadata Form**: Direct profile modifications.

### 🔒 Security Settings (`/settings/security`)
- **Password Form**: Checks strength guidelines.
- **Active Devices / Sessions**: Displays operating systems, IP addresses, and dates of authorization. Allows remote revocation.

### 🔔 Notification Settings (`/settings/notifications`)
- Toggles for email notifications, security alerts, and weekly digest schedules.

### 👁️ Privacy Settings (`/settings/privacy`)
- Visibility options, search preferences, and ranking inclusion rules.

### 🔌 Integrations (`/settings/integrations`)
- Integrates with external providers (GitHub, Resend, Slack) via state cards.

### 🔑 API Keys (`/settings/api-keys`)
- Key management system that highlights prefixes, shows creation times, and lets users copy new secret keys instantly.

### 🏢 Organization settings (`/settings/organization`)
- Admin workspace: sets up allowed sign-up domains, requires MFA enforcement, lists active organization members, and handles invitations.

### ⚠️ Danger Zone (`/settings/danger`)
- Confirms destructive operations like account deletion via input confirmation boxes.

---

## 🚀 Activation Checklist

To fully enable settings capabilities, complete these steps:

1. **Paste SQL Migrations**:
   Go to the Supabase SQL Editor and execute the SQL script in the Database Schema section of this file.
2. **Verify Avatars Storage Bucket**:
   Ensure the `avatars` bucket exists in your Supabase Console under **Storage**. The database migration automatically attempts creation, but you can double-check the bucket permissions settings.
3. **Verify App Execution**:
   Run `npm run dev` and navigate to `http://localhost:3000/dashboard/settings` to verify layout routing.
