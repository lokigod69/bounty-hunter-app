import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readLatestStorageMigration(): string {
  const migrationsDir = resolve(repoRoot, 'supabase/migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('_storage_buckets_and_policies.sql'))
    .sort();
  const migrationFile = migrationFiles[migrationFiles.length - 1];

  if (!migrationFile) {
    throw new Error('Missing storage bucket policy migration.');
  }

  return readFileSync(resolve(migrationsDir, migrationFile), 'utf8');
}

describe('storage bucket policy migration', () => {
  it('codifies all buckets used by the app', () => {
    const migration = readLatestStorageMigration();

    expect(migration).toContain("'bounty-proofs'");
    expect(migration).toContain("'reward-images'");
    expect(migration).toContain("'avatars'");
  });

  it('keeps proof objects private and participant-scoped', () => {
    const migration = readLatestStorageMigration();

    expect(migration).toContain("public = false");
    expect(migration).toContain('tasks.assigned_to = auth.uid()');
    expect(migration).toContain('tasks.created_by = auth.uid()');
  });
});
