import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * SERVER-ONLY. Never import this in a Client Component or anywhere
 * that could end up in a browser bundle — SUPABASE_SERVICE_ROLE_KEY
 * must never be exposed client-side. This file should only ever be
 * imported from Server Actions or Route Handlers.
 *
 * Used for exactly one thing in this codebase: lazily provisioning the
 * global "VAULTX AI Red Team" system agent profile, which requires
 * creating a real auth.users row via the Admin API (the same pattern
 * already used in scripts/seed-demo-data.mjs from Week 8 — this is the
 * first time that pattern is used inside an interactive request rather
 * than an offline script, which is why it's worth calling out clearly
 * here rather than burying it in a one-off helper).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — " +
      "required for admin-level operations like system agent provisioning."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
