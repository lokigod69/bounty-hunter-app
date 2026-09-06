import { describe, expect, it } from 'vitest';
import { buildInviteUrl } from './publicAppUrl';

describe('shareable invitation URLs', () => {
  it('uses the configured public origin inside a native webview', () => {
    expect(buildInviteUrl('a token', 'capacitor://localhost', 'https://bounty.example/app/'))
      .toBe('https://bounty.example/invite/a%20token');
  });
  it('keeps web and local development links on their own origin when not configured', () => {
    expect(buildInviteUrl('abc', 'https://bounty.example')).toBe('https://bounty.example/invite/abc');
    expect(buildInviteUrl('abc', 'http://localhost:6075')).toBe('http://localhost:6075/invite/abc');
  });
  it('refuses unusable native and insecure public links', () => {
    for (const origin of ['capacitor://localhost', 'file:///', 'http://public.example', 'https://user:password@example.com']) {
      expect(() => buildInviteUrl('abc', origin)).toThrow();
    }
  });
});
