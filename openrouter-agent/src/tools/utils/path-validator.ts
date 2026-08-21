import { resolve, relative, isAbsolute } from 'path';

/**
 * Validates and confines a user-supplied path within the allowed base directory
 * to prevent directory traversal vulnerabilities (e.g. ../../etc/passwd or SAM access).
 */
export function validatePath(userPath: string, baseDir: string = process.cwd()): string {
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Invalid path provided.');
  }

  const base = resolve(baseDir);
  const absolute = resolve(base, userPath);
  const rel = relative(base, absolute);

  // Check if the resolved path escapes the base directory
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('Access denied: Path traversal outside project directory is not permitted.');
  }

  return absolute;
}

/**
 * Validates a regular expression against catastrophic backtracking (ReDoS)
 * and excessive pattern lengths.
 */
const MAX_PATTERN_LENGTH = 150;
const DANGEROUS_PATTERNS = [
  /\(\?\=/,
  /\(\?\!/,
  /\(\?\<=/,
  /\(\?\<!/,
  /\(\?\>/,
  /\(\?\|/,
  /(\w\+)+\+/,
  /(\.\*)+\*/,
  /(\.\+)+\+/,
];

export function validateRegexPattern(pattern: string): string {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('Invalid regex pattern provided.');
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`Regex pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters.`);
  }
  if (DANGEROUS_PATTERNS.some((d) => d.test(pattern))) {
    throw new Error('Regex pattern rejected: Potentially vulnerable to catastrophic backtracking (ReDoS).');
  }
  return pattern;
}

/**
 * Sanitizes system errors to avoid leaking internal server paths and stack traces.
 */
export function sanitizeError(err: unknown, fallbackMessage = 'Operation failed'): string {
  if (err instanceof Error) {
    // If it's one of our explicit validation errors, allow the message
    if (
      err.message.startsWith('Access denied') ||
      err.message.startsWith('Command not allowed') ||
      err.message.startsWith('Regex pattern') ||
      err.message.startsWith('Rate limit')
    ) {
      return err.message;
    }
  }
  return fallbackMessage;
}
