import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { validatePath, validateRegexPattern, sanitizeError } from './utils/path-validator.js';
import { checkRateLimit } from './utils/rate-limiter.js';

const execFileAsync = promisify(execFile);

export const grepTool = tool({
  name: 'grep',
  description: 'Search file contents by regex pattern within the workspace',
  inputSchema: z.object({
    pattern: z.string().describe('Regex pattern to search for'),
    path: z.string().optional().describe('Directory or file to search relative to workspace (default: cwd)'),
    glob: z.string().optional().describe('File filter, e.g. "*.ts"'),
    ignoreCase: z.boolean().optional(),
  }),
  execute: async ({ pattern, path, glob: fileGlob, ignoreCase }) => {
    try {
      if (!checkRateLimit('grep', 40)) {
        return { error: 'Rate limit exceeded: Too many grep search operations.' };
      }

      const safePattern = validateRegexPattern(pattern);
      const searchPath = validatePath(path ?? '.');

      const args = ['--no-heading', '--line-number', '--color=never'];
      if (ignoreCase) args.push('-i');
      if (fileGlob) args.push('--glob', fileGlob);
      args.push('--', safePattern, searchPath);

      const { stdout } = await execFileAsync('rg', args, {
        maxBuffer: 256 * 1024,
        timeout: 10000,
      });
      const matches = stdout.split('\n').filter(Boolean).slice(0, 100).map((line) => {
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (!match) return { raw: line };
        return { file: match[1], line: Number(match[2]), content: match[3] };
      });
      return { matches, total: matches.length };
    } catch (err: any) {
      if (err.code === 'ENOENT') return { error: 'ripgrep (rg) not found. Install: https://github.com/BurntSushi/ripgrep' };
      if (err.code === 1) return { matches: [], total: 0 };
      return { error: sanitizeError(err, 'Failed to perform grep search.') };
    }
  },
});
