import coinFace from '../../assets/generated/coin-face.webp';
import { useFormatters } from '../../hooks/useFormatters';

export type CoinSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export interface CoinProps {
  value?: number;
  size?: CoinSize;
  className?: string;
}
const sizes = { xs: 24, sm: 32, md: 48, lg: 64, xl: 80 };

/** The artwork is decorative; live, localized amounts sit beside the engraving. */
export function Coin({ value, size = 'md', className = '' }: CoinProps) {
  const { number } = useFormatters();
  const dimension = sizes[size];
  return (
    <span className={`coin coin-${size} ${className}`}>
      <img src={coinFace} alt="" aria-hidden="true" draggable={false}
        width={dimension} height={dimension}
        style={{ width: dimension, height: dimension }} />
      {value !== undefined && <span className="coin-amount">{number(value)}</span>}
    </span>
  );
}
export default Coin;
