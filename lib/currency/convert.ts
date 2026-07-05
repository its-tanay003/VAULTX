/**
 * VAULTX Currency Conversion (display only)
 *
 * Uses frankfurter.app — a free, keyless exchange-rate API backed by
 * the European Central Bank's published reference rates. This is for
 * showing "~$X USD" next to a EUR/GBP reward in the dashboard so an
 * org can eyeball relative amounts; it does NOT affect what Stripe
 * actually transfers. Stripe handles any real currency conversion
 * itself at payout time using its own live rates — duplicating that
 * logic here would risk the displayed estimate silently drifting from
 * what the researcher actually receives, which is worse than just
 * being clear this is an estimate.
 */

interface RateCache { rates: Record<string, number>; fetchedAt: number }
let cache: RateCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — FX rates don't need to be second-fresh for a display estimate

async function getRatesToUsd(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rates;

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP");
    if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`);
    const data = await res.json();

    // API gives USD->X; invert for X->USD.
    const rates: Record<string, number> = { USD: 1 };
    for (const [currency, rate] of Object.entries(data.rates as Record<string, number>)) {
      rates[currency] = 1 / rate;
    }

    cache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch (err) {
    console.error("[Currency] Failed to fetch live rates, using fallback estimates:", err);
    // Static fallback so the UI degrades to "approximate" rather than
    // breaking outright if the FX API is unreachable.
    return { USD: 1, EUR: 1.08, GBP: 1.27 };
  }
}

/** Converts an amount to its approximate USD equivalent for display. Returns null for USD input (no conversion needed). */
export async function convertToUsdEstimate(amount: number, currency: string): Promise<number | null> {
  if (currency === "USD") return null;
  const rates = await getRatesToUsd();
  const rate = rates[currency];
  if (!rate) return null;
  return Math.round(amount * rate);
}
