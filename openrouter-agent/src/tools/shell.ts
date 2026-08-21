import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { checkRateLimit } from './utils/rate-limiter.js';
import { sanitizeError } from './utils/path-validator.js';

const execAsync = promisify(exec);

// Allowed safe base commands for developer tooling
const ALLOWED_COMMANDS = new Set([
  'git',
  'npm',
  'npx',
  'node',
  'tsx',
  'tsc',
  'cat',
  'ls',
  'pwd',
  'grep',
  'rg',
  'echo',
  'dir',
  'type',
  'find',
  'diff',
]);

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[\/\\]/i,
  /format\s+[a-z]:/i,
  /del\s+\/s\s+\/q/i,
  /curl.*\|\s*(bash|sh|powershell|cmd)/i,
  /wget.*\|\s*(bash|sh|powershell|cmd)/i,
];

function isCommandAllowed(fullCommand: string): { allowed: boolean; reason?: string } {
  const trimmed = fullCommand.trim();
  if (!trimmed) return { allowed: false, reason: 'Empty command' };

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: 'Command blocked by security policy (destructive/dangerous pattern).' };
    }
  }

  // Extract base command
  const baseCmd = trimmed.split(/[\s|;&]+/)[0].toLowerCase().replace(/^.*[\\\/]/, '').replace(/\.(exe|cmd|bat|ps1)$/, '');
  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    return { allowed: false, reason: `Command '${baseCmd}' is not in the safe command allowlist.` };
  }

  return { allowed: true };
}

export const shellTool = tool({
  name: 'shell',
  description: 'Execute an allowlisted development shell command and return output',
  inputSchema: z.object({
    command: z.string().max(1000, 'Command string too long').describe('Shell command to execute'),
    timeout: z.number().max(60).optional().describe('Timeout in seconds (max: 60, default: 30)'),
  }),
  execute: async ({ command, timeout }) => {
    try {
      if (!checkRateLimit('shell', 20)) {
        return { error: 'Rate limit exceeded: Too many shell commands executed per minute.' };
      }

      const check = isCommandAllowed(command);
      if (!check.allowed) {
        return { error: `Security check failed: ${check.reason}` };
      }

      const timeoutMs = Math.min((timeout ?? 30), 60) * 1000;
      const { stdout, stderr } = await execAsync(command, {
        timeout: timeoutMs,
        maxBuffer: 256 * 1024,
        cwd: process.cwd(),
      });

      const output = (stdout + stderr).trim();
      const lines = output.split('\n');
      const truncated = lines.length > 1000;
      return {
        output: truncated ? lines.slice(-1000).join('\n') : output,
        exitCode: 0,
        ...(truncated && { truncated: true }),
      };
    } catch (err: any) {
      if (err.killed) {
        return { output: err.stdout?.trim() ?? '', exitCode: null, timedOut: true, error: 'Command timed out.' };
      }
      return {
        output: ((err.stdout ?? '') + (err.stderr ?? '')).trim(),
        exitCode: err.code ?? 1,
        error: sanitizeError(err, 'Command execution failed.'),
      };
    }
  },
});
