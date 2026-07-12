-- =============================================================================
-- VAULTX — Migration 030: Add Subscription Payment Failed Timestamp
-- =============================================================================
-- Adds a payment_failed_at timestamp to tracking grace periods.
-- =============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN payment_failed_at timestamp with time zone;
