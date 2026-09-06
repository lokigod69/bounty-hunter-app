import { useState } from 'react';
import digit0 from '../../assets/generated/credit-digit-0.webp';
import digit1 from '../../assets/generated/credit-digit-1.webp';
import digit2 from '../../assets/generated/credit-digit-2.webp';
import digit3 from '../../assets/generated/credit-digit-3.webp';
import digit4 from '../../assets/generated/credit-digit-4.webp';
import digit5 from '../../assets/generated/credit-digit-5.webp';
import digit6 from '../../assets/generated/credit-digit-6.webp';
import digit7 from '../../assets/generated/credit-digit-7.webp';
import digit8 from '../../assets/generated/credit-digit-8.webp';
import digit9 from '../../assets/generated/credit-digit-9.webp';
import { useFormatters } from '../../hooks/useFormatters';

export type CoinSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export interface CoinProps {
  value?: number;
  size?: CoinSize;
  className?: string;
}
const sizes = { xs: 24, sm: 48, md: 64, lg: 88, xl: 112 };
// All glyphs have the same 96px cap height; retain their authored proportions.
const digits: Partial<Record<string, { src: string; width: number }>> = {
  '0': { src: digit0, width: 89 }, '1': { src: digit1, width: 71 },
  '2': { src: digit2, width: 91 }, '3': { src: digit3, width: 91 },
  '4': { src: digit4, width: 96 }, '5': { src: digit5, width: 92 },
  '6': { src: digit6, width: 91 }, '7': { src: digit7, width: 92 },
  '8': { src: digit8, width: 92 }, '9': { src: digit9, width: 91 },
};

/** One shared raster numeral set sits on the active skin's solid metal face. */
export function Coin({ value, size = 'md', className = '' }: CoinProps) {
  const { number } = useFormatters();
  const [artFailed, setArtFailed] = useState(false);
  const formatted = value === undefined ? '' : number(value);
  const characters = Array.from(formatted);
  const advance = characters.reduce((sum, char) => sum + (digits[char] ? digits[char].width / 96 : .3), 0)
    + Math.max(0, characters.length - 1) * .035;
  // Grow small tokens for longer balances; never abbreviate or distort a glyph.
  const dimension = value === undefined ? sizes[size] : Math.max(sizes[size], Math.min(112, formatted.length * 16 + 16));
  const fontSize = Math.min(dimension * .4, dimension * .64 / Math.max(1, advance));
  const useText = artFailed || /[^0-9.,\s\-\u2212]/u.test(formatted);
  return (
    <span className={`coin coin-${size} ${value === undefined ? '' : 'coin-valued'} ${className}`}
      style={{ width: dimension, height: dimension, fontSize }}>
      {value !== undefined && <>
        <span className="coin-value-text sr-only">{formatted}</span>
        <span className="coin-amount" aria-hidden="true">
          {useText ? formatted : characters.map((char, index) => {
            const glyph = digits[char];
            return glyph
              ? <img key={index} className="coin-digit" src={glyph.src} alt="" draggable={false}
                  width={glyph.width} height={96} style={{ width: `${glyph.width / 96}em` }}
                  onError={() => setArtFailed(true)} />
              : <span key={index} className="coin-separator">{char}</span>;
          })}
        </span>
      </>}
    </span>
  );
}
export default Coin;
