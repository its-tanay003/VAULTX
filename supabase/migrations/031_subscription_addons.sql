-- =============================================================================
-- VAULTX — Migration 031: Subscription Add-ons
-- =============================================================================
-- Adds a subscription_addons table so individual features (extra seats,
-- extra scan runs, etc.) can be purchased on top of a base plan via
-- Stripe Subscription Items, without requiring a full plan upgrade.
--
-- Schema design decisions:
--   • org_id FK rather than subscription_id — if the subscription row is
--     replaced (e.g. plan change) we don't lose add-on history.
--   • addon_type is a plain text enum-style value (not a PG enum) so we
--     can add new addon types without a migration each time.
--   • quantity is the *currently active* unit count on this line item;
--     Stripe is the system of record — the webhook upserts this column.
--   • stripe_subscription_item_id ties back to the Stripe line item so
--     we can correctly prorate when the quantity changes.
-- =============================================================================

CREATE TABLE public.subscription_addons (
  id                          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  addon_type                  text NOT NULL,
  quantity                    integer NOT NULL DEFAULT 1,
  stripe_subscription_item_id text UNIQUE,
  created_at                  timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  updated_at                  timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,

  CONSTRAINT subscription_addons_quantity_positive CHECK (quantity > 0),
  CONSTRAINT subscription_addons_type_nonempty CHECK (addon_type <> '')
);

-- One active add-on row per (org, type) — a quantity column update is cheaper
-- than insert/delete churn when Stripe reports a quantity change.
CREATE UNIQUE INDEX subscription_addons_org_type_uidx
  ON public.subscription_addons (org_id, addon_type);

-- Index for fast org-scoped lookups from getOrgLimits()
CREATE INDEX subscription_addons_org_id_idx
  ON public.subscription_addons (org_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

-- Org owner can read their own add-ons
CREATE POLICY "Allow select for organization owners"
  ON public.subscription_addons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = subscription_addons.org_id AND o.owner_id = auth.uid()
    )
  );
-- Service role (webhook handler) can write; no anon/authenticated INSERT policy intentionally.

-- ─── Known add-on types (documentation, not enforced by DB) ──────────────────
-- 'extra_seats'                  — additional user seats beyond plan limit
-- 'extra_ai_triage'              — additional AI triage request bundles (per 100)
-- 'extra_red_team_runs'          — additional monthly red team scan runs
-- 'extra_pdf_reports'            — additional PDF export slots per month
-- 'extra_private_repos'          — additional private repositories to scan
-- 'extra_ptaas_engagements'      — additional concurrent PTaaS engagements
