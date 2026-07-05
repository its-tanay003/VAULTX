/**
 * VAULTX GitHub App Authentication
 *
 * SERVER-ONLY. Implements the two-step GitHub App auth flow:
 *   1. Sign a short-lived JWT as the App itself (RS256, App private key)
 *   2. Exchange that JWT for an installation access token scoped to
 *      one specific installation (org/user that installed the App)
 *
 * Deliberately uses the Web Crypto API (crypto.subtle) rather than the
 * `jsonwebtoken` npm package, which depends on Node's `crypto` module
 * for RSA signing. Web Crypto is natively available in Cloudflare
 * Workers without relying on nodejs_compat for this specific
 * operation — one less thing that could break on a runtime change.
 *
 * Installation tokens are short-lived (1 hour, per GitHub) and are not
 * cached here — each call mints a fresh one. GitHub's rate limit on
 * token minting (a few thousand/hour) is far above what this
 * zero-budget platform's scan volume would ever approach, so the
 * added complexity of a token cache isn't worth it yet.
 */

const GITHUB_APP_ID          = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY; // PEM, \n-escaped in env

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Converts a PEM-encoded RSA private key into a CryptoKey for signing. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, "\n");
  const pemBody = normalized
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/** Signs a GitHub App JWT valid for 9 minutes (GitHub's max is 10). */
async function createAppJwt(): Promise<string> {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App is not configured (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY missing)");
  }

  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: GITHUB_APP_ID };

  const encodedHeader  = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(GITHUB_APP_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Exchanges the App JWT for a token scoped to one installation. This
 * is the token actually used to call the GitHub API on behalf of that
 * installation's repos.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = await createAppJwt();

  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to mint installation token (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.token as string;
}

/** Fetches installation metadata (account login, type, repo selection) — used right after the install callback. */
export async function getInstallationMetadata(installationId: number): Promise<{
  accountLogin: string;
  accountType:  string;
  repositorySelection: string;
}> {
  const jwt = await createAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch installation metadata (${res.status})`);

  const data = await res.json();
  return {
    accountLogin: data.account?.login ?? "unknown",
    accountType:  data.account?.type ?? "User",
    repositorySelection: data.repository_selection ?? "selected",
  };
}
