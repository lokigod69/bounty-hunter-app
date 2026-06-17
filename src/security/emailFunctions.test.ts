import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('email edge function security', () => {
  it('keeps active edge functions off the legacy Gmail OAuth provider', () => {
    const activeEmailFunctions = [
      'supabase/functions/notify-reward-creator/index.ts',
      'supabase/functions/send-new-bounty-alert/index.ts',
      'supabase/functions/send-proof-submitted-alert/index.ts',
    ];

    for (const functionPath of activeEmailFunctions) {
      const source = readRepoFile(functionPath);

      expect(source, functionPath).not.toMatch(/nodemailer|GMAIL_/);
    }
  });

  it('requires bearer auth before legacy alert functions can respond', () => {
    const legacyAlertFunctions = [
      'supabase/functions/send-new-bounty-alert/index.ts',
      'supabase/functions/send-proof-submitted-alert/index.ts',
    ];

    for (const functionPath of legacyAlertFunctions) {
      const source = readRepoFile(functionPath);

      expect(source, functionPath).toContain('Missing or invalid Authorization header.');
      expect(source, functionPath).toContain('status: 401');
    }
  });
});
