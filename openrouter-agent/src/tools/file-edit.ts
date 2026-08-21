import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';
import { validatePath, sanitizeError } from './utils/path-validator.js';
import { checkRateLimit } from './utils/rate-limiter.js';

export const fileEditTool = tool({
  name: 'file_edit',
  description: 'Apply search-and-replace edits to a file within the workspace',
  inputSchema: z.object({
    path: z.string().describe('Path to the file relative to the workspace'),
    edits: z.array(z.object({
      old_text: z.string().max(500000, 'old_text is too large').describe('Text to find (must appear exactly once)'),
      new_text: z.string().max(500000, 'new_text is too large').describe('Replacement text'),
    })).max(50, 'Too many edit operations in a single call'),
  }),
  execute: async ({ path, edits }) => {
    try {
      if (!checkRateLimit('file_edit', 60)) {
        return { error: 'Rate limit exceeded: Too many file edit operations.' };
      }

      const safePath = validatePath(path);
      let content = await readFile(safePath, 'utf-8');
      const original = content;

      for (const edit of edits) {
        const count = content.split(edit.old_text).length - 1;
        if (count === 0) return { error: `Text not found: "${edit.old_text.slice(0, 50)}"` };
        if (count > 1) return { error: `Ambiguous match (${count} occurrences): "${edit.old_text.slice(0, 50)}"` };
        content = content.replace(edit.old_text, edit.new_text);
      }

      await writeFile(safePath, content, 'utf-8');

      const oldLines = original.split('\n');
      const newLines = content.split('\n');
      const diff = [`--- ${path}`, `+++ ${path}`];
      let i = 0;
      while (i < oldLines.length || i < newLines.length) {
        if (oldLines[i] !== newLines[i]) {
          if (i < oldLines.length) diff.push(`-${oldLines[i]}`);
          if (i < newLines.length) diff.push(`+${newLines[i]}`);
        }
        i++;
      }

      return { edited: true, path, diff: diff.join('\n') };
    } catch (err: any) {
      return { error: sanitizeError(err, 'Failed to edit file.') };
    }
  },
});
