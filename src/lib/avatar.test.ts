import { describe, expect, it } from 'vitest';
import { avatarFallback } from './avatar';

const decode = (uri: string) =>
  decodeURIComponent(uri.replace('data:image/svg+xml,', ''));

describe('avatarFallback', () => {
  it('renders two initials for a two-word name', () => {
    expect(decode(avatarFallback('Michael Lazar'))).toContain('>ML</text>');
  });

  it('defaults to U for empty input', () => {
    expect(decode(avatarFallback(''))).toContain('>U</text>');
    expect(decode(avatarFallback(null))).toContain('>U</text>');
  });

  it('does not throw on emoji-leading names (astral code points)', () => {
    expect(() => avatarFallback('🔥 Mike')).not.toThrow();
    expect(decode(avatarFallback('🔥 Mike'))).toContain('🔥M');
  });

  it('escapes XML-significant characters in initials', () => {
    const svg = decode(avatarFallback('<script> &co'));
    expect(svg).toContain('&lt;&amp;');
    expect(svg).not.toContain('<script>');
  });

  it('is deterministic for the same name', () => {
    expect(avatarFallback('Saya')).toBe(avatarFallback('Saya'));
  });
});
