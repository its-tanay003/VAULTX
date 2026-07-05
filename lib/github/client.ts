/**
 * VAULTX GitHub Client
 *
 * UPDATED Week 12: fetchRepoTree() now accepts an optional `extensions`
 * parameter instead of a hardcoded list — full drop-in replacement for
 * the Week 6 version. This is what lets the Web3 audit module reuse
 * this exact same fetch/fetch-files pipeline for .sol files instead of
 * needing a parallel GitHub client. Calling fetchRepoTree() with no
 * extensions argument behaves identically to the Week 6 version
 * (defaults to the original general-purpose language list), so the
 * existing code quality module (lib/ai/code-review.ts) needs zero
 * changes.
 *
 * Uses GitHub's public REST API when no token is given (60 req/hour
 * per IP — fine for demo-scale scanning). When a GitHub App
 * installation token is passed (see lib/github/app-auth.ts and
 * app/actions/github-app.ts), fetchRepoTree/fetchFileContent/fetchFiles
 * authenticate as that installation instead, which is what makes
 * private repo scanning actually work end-to-end — previously only
 * fetchRepoMetadata accepted a token, so the private-repo error message
 * would clear but the subsequent tree/file fetches would silently fail.
 */

const GITHUB_API = "https://api.github.com";

export interface ParsedRepoUrl {
  owner: string;
  repo:  string;
}

export interface RepoMetadata {
  fullName:      string;
  description:   string | null;
  defaultBranch: string;
  language:      string | null;
  stars:         number;
  isPrivate:     boolean;
}

export interface RepoFile {
  path:    string;
  content: string;
}

const DEFAULT_SCANNABLE_EXT = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rb", ".java",
  ".php", ".rs", ".c", ".cpp", ".cs", ".sql",
];

const SKIP_PATTERNS = [
  "node_modules/", "dist/", "build/", ".next/", "vendor/",
  "test/", "tests/", "__tests__/", ".test.", ".spec.",
  "min.js", "lock.json", ".lock",
];

/* ─── Parse a GitHub URL into owner/repo ──────────────────────────────────── */
export function parseGithubUrl(url: string): ParsedRepoUrl | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
    const match   = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

/* ─── Fetch repo metadata ─────────────────────────────────────────────────── */
export async function fetchRepoMetadata(owner: string, repo: string, token?: string): Promise<RepoMetadata> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 404) throw new Error("Repository not found or is private");
  if (res.status === 403) throw new Error("GitHub API rate limit exceeded — try again in a few minutes");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json();
  // Private repos are only supported when accessed through an authenticated
  // GitHub App installation token — never via the unauthenticated public path.
  if (data.private && !token) {
    throw new Error("Private repositories require connecting the VAULTX GitHub App for this organization (Settings → Integrations).");
  }

  return {
    fullName:      data.full_name,
    description:   data.description,
    defaultBranch: data.default_branch,
    language:      data.language,
    stars:         data.stargazers_count,
    isPrivate:     data.private,
  };
}

/* ─── Fetch file tree, filtered by extension ──────────────────────────────── */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  extensions: string[] = DEFAULT_SCANNABLE_EXT,
  token?: string
): Promise<string[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) throw new Error(`Failed to fetch repo tree: ${res.status}`);

  const data = await res.json();
  const tree = (data.tree ?? []) as Array<{ path: string; type: string; size?: number }>;

  return tree
    .filter((f) => f.type === "blob")
    .filter((f) => !SKIP_PATTERNS.some((p) => f.path.includes(p)))
    .filter((f) => extensions.some((ext) => f.path.endsWith(ext)))
    .filter((f) => (f.size ?? 0) < 100_000) // skip files > 100KB
    .map((f) => f.path);
}

/* ─── Select highest-priority files for a quick scan (cost control) ──────── */
export function selectPriorityFiles(paths: string[], max = 8): string[] {
  const HIGH_PRIORITY = /auth|login|security|password|token|crypto|payment|admin|api\/|controller|handler|middleware/i;
  const high = paths.filter((p) => HIGH_PRIORITY.test(p));
  const rest = paths.filter((p) => !HIGH_PRIORITY.test(p));
  return [...high, ...rest].slice(0, max);
}

/**
 * Web3-specific priority selector: contracts handling value transfer,
 * access control, or external calls are highest-risk and reviewed first.
 */
export function selectPrioritySolidityFiles(paths: string[], max = 10): string[] {
  const HIGH_PRIORITY = /vault|treasury|token|swap|pool|stake|bridge|governance|owner|admin|proxy|oracle/i;
  const high = paths.filter((p) => HIGH_PRIORITY.test(p));
  const rest = paths.filter((p) => !HIGH_PRIORITY.test(p));
  return [...high, ...rest].slice(0, max);
}

/* ─── Fetch raw file content ───────────────────────────────────────────────── */
export async function fetchFileContent(
  owner: string, repo: string, branch: string, path: string, token?: string
): Promise<string> {
  if (token) {
    // Private repos: raw.githubusercontent.com doesn't accept App
    // installation tokens for private content, so we go through the
    // authenticated Contents API instead, requesting the raw media
    // type to skip the usual base64 envelope.
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.raw+json",
        },
      }
    );
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 8000);
  }

  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  );
  if (!res.ok) return "";
  const text = await res.text();
  return text.slice(0, 8000);
}

/* ─── Fetch multiple files in parallel ───────────────────────────────────── */
export async function fetchFiles(
  owner: string, repo: string, branch: string, paths: string[], token?: string
): Promise<RepoFile[]> {
  const results = await Promise.all(
    paths.map(async (path) => ({
      path,
      content: await fetchFileContent(owner, repo, branch, path, token),
    }))
  );
  return results.filter((f) => f.content.length > 0);
}
