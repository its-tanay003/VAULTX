import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { glob } from 'glob';
import { validatePath, sanitizeError } from './utils/path-validator.js';
import { checkRateLimit } from './utils/rate-limiter.js';

export const globTool = tool({
  name: 'glob',
  description: 'Find files matching a glob pattern within the workspace',
  inputSchema: z.object({
    pattern: z.string().max(200, 'Glob pattern too long').describe('Glob pattern, e.g. "src/**/*.ts"'),
    path: z.string().optional().describe('Directory to search in relative to workspace (default: cwd)'),
  }),
  execute: async ({ pattern, path }) => {
    try {
      if (!checkRateLimit('glob', 60)) {
        return { error: 'Rate limit exceeded: Too many glob search operations.' };
      }

      const searchDir = validatePath(path ?? '.');
      const matches = await glob(pattern, {
        cwd: searchDir,
        ignore: ['node_modules/**', '.git/**', '.sessions/**'],
        nodir: true,
      });
      const capped = matches.slice(0, 1000);
      return {
        files: capped,
        total: matches.length,
        ...(matches.length > 1000 && { truncated: true }),
      };
    } catch (err: any) {
      return { error: sanitizeError(err, 'Failed to perform glob search.') };
    }
  },
});
