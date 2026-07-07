// src/lib/avatar.ts
// Deterministic, network-free fallback avatar (initials on a colored disc).
// Replaces the external avatar.iran.liara.run dependency and its gendered defaults.

export function avatarFallback(name?: string | null): string {
  const label = (name ?? '').trim() || 'User';
  const initials =
    label
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  // Deterministic hue from the label so a given user always gets the same color.
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const bg = `hsl(${hue}, 42%, 26%)`;
  const fg = `hsl(${hue}, 75%, 78%)`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="48" fill="${bg}"/>` +
    `<text x="48" y="50" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Poppins, system-ui, sans-serif" font-size="40" font-weight="700" fill="${fg}">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default avatarFallback;
