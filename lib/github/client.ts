/**
 * VAULTX GitHub Client
 *
 * Uses GitHub's unauthenticated public REST API. No OAuth, no stored tokens.
 * Rate limit: 60 requests/hour per IP — sufficient for demo-scale scanning.
 * Private repo support is a post-MVP item (would require a GitHub App).
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
export async function fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (res.status === 404) throw new Error("Repository not found or is private");
  if (res.status === 403) throw new Error("GitHub API rate limit exceeded — try again in a few minutes");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json();

  if (data.private) throw new Error("Private repositories are not yet supported");

  return {
    fullName:      data.full_name,
    description:   data.description,
    defaultBranch: data.default_branch,
    language:      data.language,
    stars:         data.stargazers_count,
    isPrivate:     data.private,
  };
}

/* ─── Fetch file tree (top-level + one level deep, capped) ───────────────── */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string
): Promise<string[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  if (!res.ok) throw new Error(`Failed to fetch repo tree: ${res.status}`);

  const data = await res.json();
  const tree = (data.tree ?? []) as Array<{ path: string; type: string; size?: number }>;

  return tree
    .filter((f) => f.type === "blob")
    .filter((f) => isScannableFile(f.path))
    .filter((f) => (f.size ?? 0) < 100_000) // skip files > 100KB
    .map((f) => f.path);
}

/* ─── Determine if a file is worth scanning ───────────────────────────────── */
function isScannableFile(path: string): boolean {
  const SCANNABLE_EXT = [
    ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rb", ".java",
    ".php", ".rs", ".c", ".cpp", ".cs", ".sql",
  ];
  const SKIP_PATTERNS = [
    "node_modules/", "dist/", "build/", ".next/", "vendor/",
    "test/", "tests/", "__tests__/", ".test.", ".spec.",
    "min.js", "lock.json", ".lock",
  ];

  if (SKIP_PATTERNS.some((p) => path.includes(p))) return false;
  return SCANNABLE_EXT.some((ext) => path.endsWith(ext));
}

/* ─── Select highest-priority files for a quick scan (cost control) ──────── */
export function selectPriorityFiles(paths: string[], max = 8): string[] {
  // Prioritize: auth/security-sounding files, then config, then everything else
  const HIGH_PRIORITY = /auth|login|security|password|token|crypto|payment|admin|api\/|controller|handler|middleware/i;

  const high = paths.filter((p) => HIGH_PRIORITY.test(p));
  const rest = paths.filter((p) => !HIGH_PRIORITY.test(p));

  return [...high, ...rest].slice(0, max);
}

/* ─── Fetch raw file content ───────────────────────────────────────────────── */
export async function fetchFileContent(
  owner: string, repo: string, branch: string, path: string
): Promise<string> {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  );
  if (!res.ok) return ""; // skip files that fail to fetch
  const text = await res.text();
  return text.slice(0, 8000); // cap individual file size sent to AI
}

/* ─── Fetch multiple files in parallel ───────────────────────────────────── */
export async function fetchFiles(
  owner: string, repo: string, branch: string, paths: string[]
): Promise<RepoFile[]> {
  const results = await Promise.all(
    paths.map(async (path) => ({
      path,
      content: await fetchFileContent(owner, repo, branch, path),
    }))
  );
  return results.filter((f) => f.content.length > 0);
}
