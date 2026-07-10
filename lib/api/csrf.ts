import { NextResponse } from "next/server";

/**
 * Validates request Origin / Referer against our own configured domain.
 * Since Supabase keys and sessions are public, mutating REST endpoints must
 * check these headers to ensure requests originate from the same origin,
 * preventing CSRF attacks.
 *
 * Exempts internal secret calls (e.g. cron triggers, internal validation hooks)
 * that present a valid `x-vault-secret`.
 *
 * Returns a NextResponse if unauthorized, or null if valid.
 */
export function validateCsrf(request: Request): Response | null {
  // Check for internal secret exemption first
  const internalSecret = request.headers.get("x-vault-secret");
  if (internalSecret && internalSecret === process.env.VAULT_INTERNAL_SECRET) {
    return null;
  }

  const appUrlStr = process.env.NEXT_PUBLIC_APP_URL || "https://vaultx.io";
  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(appUrlStr).origin;
  } catch {
    allowedOrigin = appUrlStr;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Validate Origin header
  if (origin) {
    if (origin.toLowerCase() !== allowedOrigin.toLowerCase()) {
      return NextResponse.json({ error: "CSRF Validation Failed: Origin mismatch" }, { status: 403 });
    }
    return null;
  }

  // Fallback to Referer header if Origin is not present
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin.toLowerCase() !== allowedOrigin.toLowerCase()) {
        return NextResponse.json({ error: "CSRF Validation Failed: Referer mismatch" }, { status: 403 });
      }
      return null;
    } catch {
      return NextResponse.json({ error: "CSRF Validation Failed: Malformed referer" }, { status: 403 });
    }
  }

  // Block mutating requests without Origin or Referer (unless API endpoints explicitly override it)
  return NextResponse.json({ error: "CSRF Validation Failed: Missing origin/referer header" }, { status: 403 });
}
