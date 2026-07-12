-- =============================================================================
-- VAULTX — Migration 028: Subscription & Billing Infrastructure Schema
-- =============================================================================
-- Establishes the core tables for SaaS plans, subscriptions, usage logging,
-- billing event streams, and invoicing. Alters organizations to support
-- billing relations and sets up secure RLS constraints.
-- =============================================================================

-- ─── 1. Types & Enums ────────────────────────────────────────────────────────

CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired'
);

-- ─── 2. Tables & Schema Definitions ─────────────────────────────────────────

-- plans: Defines core capabilities and tier limits
CREATE TABLE public.plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  monthly_price_cents integer NOT NULL,
  yearly_price_cents integer NOT NULL,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- subscriptions: Tracks active org subscription states sync'd from Stripe
CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.plans(id) NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status public.subscription_status NOT NULL,
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- usage_logs: Captures audit trail of quota usages for current billing cycle
CREATE TABLE public.usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  metric text NOT NULL,
  amount integer NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- billing_events: Replay/audit log of Stripe webhook notifications (Service Role Only)
CREATE TABLE public.billing_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- invoices: Stores historical invoicing metadata and PDF attachments
CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL,
  pdf_url text,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alter organizations table to map Stripe customers and billing plans
ALTER TABLE public.organizations 
  ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN stripe_customer_id text UNIQUE;

-- ─── 3. Row Level Security (RLS) & Policies ──────────────────────────────────

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Plans Policies
CREATE POLICY "Allow read access to all authenticated users for plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

-- Subscriptions Policies (Readable by organization owner only)
CREATE POLICY "Allow select for organization owners only"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = subscriptions.org_id AND o.owner_id = auth.uid()
    )
  );

-- Invoices Policies (Readable by organization owner only)
CREATE POLICY "Allow select for organization owners only for invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = invoices.org_id AND o.owner_id = auth.uid()
    )
  );

-- Usage Logs Policies (Owner, admin, and triager roles check)
CREATE POLICY "Allow select for organization owner, admin, and triager roles"
  ON public.usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = usage_logs.org_id AND o.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = usage_logs.org_id 
        AND m.user_id = auth.uid() 
        AND m.role IN ('admin', 'triager', 'owner')
        AND m.status = 'active'
    )
  );
