// src/components/visual/StandingSigil.tsx
// THE REGISTER §3.1: a CSS-drawn hexagonal sigil carrying the standing metal.
// No art assets — clip-path + gradient. Band 0 is a hollow outline, band 2
// adds three chevrons over iron, band 4 takes the mode accent itself.

import type { StandingBand } from '../../core/credits/standing.domain';

interface StandingSigilProps {
  band: StandingBand;
  /** Width in px; height follows the hexagon's natural ratio. Default 22 (rail). */
  size?: number;
  className?: string;
}

export function StandingSigil({ band, size = 22, className = '' }: StandingSigilProps) {
  return (
    <span
      className={`standing-sigil ${className}`.trim()}
      data-band={band}
      style={{ width: size, height: Math.round(size * 1.12) }}
      aria-hidden="true"
    >
      {band === 2 && <span className="standing-sigil-chevrons" />}
    </span>
  );
}

export default StandingSigil;
