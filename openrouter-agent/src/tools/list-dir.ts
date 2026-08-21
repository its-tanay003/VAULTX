import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { readdir } from 'fs/promises';
import { validatePath, sanitizeError } from './utils/path-validator.js';
import { checkRateLimit } from './utils/rate-limiter.js';

export const listDirTool = tool({
  name: 'list_dir',
  description: 'List directory contents within the workspace',
  inputSchema: z.object({
    path: z.string().optional().describe('Directory path relative to workspace (default: cwd)'),
  }),
  execute: async ({ path }) => {
    try {
      if (!checkRateLimit('list_dir', 100)) {
        return { error: 'Rate limit exceeded: Too many directory list operations.' };
      }

      const dir = validatePath(path ?? '.');
      const entries = await readdir(dir, { withFileTypes: true });
      const sorted = entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 500)
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
      return { entries: sorted, total: entries.length };
    } catch (err: any) {
      return { error: sanitizeError(err, 'Failed to list directory.') };
    }
  },
});
