/** Shareable links must resolve outside the bundled Capacitor webview. */
export function buildInviteUrl(token: string, origin: string, configuredUrl?: string): string {
  const base = new URL(configuredUrl || origin);
  const localWeb = base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !localWeb) || base.username || base.password) {
    throw new Error('Set VITE_PUBLIC_APP_URL to the public HTTPS app URL before sharing invitations.');
  }
  return new URL(`/invite/${encodeURIComponent(token)}`, base.origin).toString();
}
