/**
 * VAULT Copilot — Connectivity Truth Source
 *
 * Combines `navigator.onLine` with an active HEAD probe against
 * `/api/vault/ping` to prevent false positives from captive portals or dead networks.
 */

export async function checkActiveConnectivity(timeoutMs: number = 3000): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`/api/vault/ping?_t=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
