import coinFace from '../../assets/generated/coin-face.webp';
import { useFormatters } from '../../hooks/useFormatters';

export type CoinSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export interface CoinProps {
  value?: number;
  size?: CoinSize;
  className?: string;
}
const sizes = { xs: 24, sm: 48, md: 64, lg: 88, xl: 112 };

/** A live amount sits in the artwork's intentionally empty enamel center. */
export function Coin({ value, size = 'md', className = '' }: CoinProps) {
  const { number } = useFormatters();
  const formatted = value === undefined ? '' : number(value);
  // Grow small medallions for longer balances instead of clipping or abbreviating.
  const dimension = value === undefined ? sizes[size] : Math.max(sizes[size], Math.min(112, formatted.length * 12 + 24));
  const fontSize = Math.min(dimension * .34, dimension * .6 / Math.max(1, formatted.length * .64));
  return (
    <span className={`coin coin-${size} ${value === undefined ? '' : 'coin-valued'} ${className}`}
      style={{ width: dimension, height: dimension, fontSize }}>
      {value === undefined && <img src={coinFace} alt="" aria-hidden="true" draggable={false}
        width={dimension} height={dimension}
        style={{ width: dimension, height: dimension }} />}
      {value !== undefined && <span className="coin-amount">{formatted}</span>}
    </span>
  );
}
export default Coin;
