import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { validatePath, sanitizeError } from './utils/path-validator.js';
import { checkRateLimit } from './utils/rate-limiter.js';

const MAX_WRITE_SIZE = 10 * 1024 * 1024; // 10MB limit

export const fileWriteTool = tool({
  name: 'file_write',
  description: 'Write content to a file within the workspace, creating it and parent directories if needed',
  inputSchema: z.object({
    path: z.string().describe('Path to the file relative to the workspace'),
    content: z.string().max(MAX_WRITE_SIZE, 'File content exceeds 10MB limit').describe('Content to write'),
  }),
  execute: async ({ path, content }) => {
    try {
      if (!checkRateLimit('file_write', 60)) {
        return { error: 'Rate limit exceeded: Too many file write operations.' };
      }

      const safePath = validatePath(path);
      await mkdir(dirname(safePath), { recursive: true });
      await writeFile(safePath, content, 'utf-8');
      return { written: true, path };
    } catch (err: any) {
      return { error: sanitizeError(err, 'Failed to write file.') };
    }
  },
});
