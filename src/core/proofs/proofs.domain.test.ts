import { describe, expect, it } from 'vitest';
import { validateProofPayload } from './proofs.domain';
import type { ProofType } from './proofs.domain';

const FILE = new File(['data'], 'proof.bin');

describe('validateProofPayload', () => {
  it('accepts a text proof with content', () => {
    expect(validateProofPayload({ type: 'text', content: 'done it' }).valid).toBe(true);
  });

  it('rejects a text proof without content', () => {
    const result = validateProofPayload({ type: 'text', content: '  ' });
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/content/i);
  });

  it('accepts a url proof with a valid URL and rejects an invalid one', () => {
    expect(validateProofPayload({ type: 'url', url: 'https://example.com/x' }).valid).toBe(true);
    expect(validateProofPayload({ type: 'url', url: 'not a url' }).valid).toBe(false);
  });

  // Phase 2.4 product decision (2026-07-07): PDF ('document') and video proofs
  // are allowed. Before 2026-07-08 these fell through to the "Unknown proof
  // type" branch and were rejected, silently blocking uploads the UI offered.
  it.each(['image', 'video', 'document'] as ProofType[])(
    'accepts a %s proof with a file',
    (type) => {
      expect(validateProofPayload({ type, file: FILE }).valid).toBe(true);
    }
  );

  it.each(['image', 'video', 'document'] as ProofType[])(
    'rejects a %s proof without a file',
    (type) => {
      const result = validateProofPayload({ type, file: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toMatch(/file/i);
    }
  );

  it('rejects an unknown proof type', () => {
    const result = validateProofPayload({ type: 'hologram' as ProofType });
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/unknown proof type/i);
  });
});
