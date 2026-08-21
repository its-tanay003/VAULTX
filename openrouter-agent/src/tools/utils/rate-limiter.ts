const toolLimits = new Map<string, { count: number; reset: number }>();

/**
 * Basic in-memory rate limiter per tool.
 */
export function checkRateLimit(toolName: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const currentWindow = Math.floor(now / 60000);
  const key = `${toolName}:${currentWindow}`;

  const current = toolLimits.get(key) || { count: 0, reset: (currentWindow + 1) * 60000 };

  if (current.count >= maxPerMinute) {
    return false;
  }

  current.count++;
  toolLimits.set(key, current);

  // Periodic cleanup of older windows
  if (toolLimits.size > 100) {
    for (const [k, v] of toolLimits.entries()) {
      if (v.reset < now) {
        toolLimits.delete(k);
      }
    }
  }

  return true;
}
