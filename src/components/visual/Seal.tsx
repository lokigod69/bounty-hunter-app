import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Check, CircleDashed, Send, Stamp, type LucideIcon } from 'lucide-react';
import { feedback } from '../../utils/feedback';
import {
  SEAL_EVENT,
  type SealEventDetail,
  type SealKind,
} from './sealEvents';

const sealConfig: Record<SealKind, { color: string; icon: LucideIcon; lift?: boolean }> = {
  accept: { color: 'var(--mode-accent)', icon: Stamp },
  approve: { color: '#22c55e', icon: Check },
  paid: { color: '#22c55e', icon: Check },
  'sent-back': { color: '#f97316', icon: CircleDashed, lift: true },
  transmit: { color: '#8b5cf6', icon: Send },
};

function Seal({ seal, onComplete }: { seal: SealEventDetail; onComplete: (id: number) => void }) {
  const config = sealConfig[seal.kind];
  const Icon = config.icon;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hapticTimer = config.lift
      ? undefined
      : window.setTimeout(() => feedback.press(), reduced ? 120 : 180);
    const removeTimer = window.setTimeout(
      () => onComplete(seal.id),
      config.lift ? 420 : reduced ? 480 : 900
    );
    return () => {
      if (hapticTimer !== undefined) window.clearTimeout(hapticTimer);
      window.clearTimeout(removeTimer);
    };
  }, [config.lift, onComplete, seal.id]);

  const style = {
    left: seal.x,
    top: seal.y,
    '--seal-color': config.color,
  } as CSSProperties;

  // Global dignity law: no ceremony in this app shakes at a person, flashes red,
  // or plays a descending tone.
  return (
    <div
      className={`seal-effect seal-effect--${config.lift ? 'lift' : 'strike'}`}
      style={style}
      aria-hidden="true"
    >
      <div className="seal-lift-ghost" />
      <div className="seal-mark">
        <Icon size={22} strokeWidth={2.1} />
      </div>
      {!config.lift && <div className="seal-shock" />}
    </div>
  );
}

export function SealLayer() {
  const [seals, setSeals] = useState<SealEventDetail[]>([]);

  useEffect(() => {
    const handleSeal = (event: Event) => {
      const seal = (event as CustomEvent<SealEventDetail>).detail;
      setSeals((current) => [...current.slice(-2), seal]);
    };
    window.addEventListener(SEAL_EVENT, handleSeal);
    return () => window.removeEventListener(SEAL_EVENT, handleSeal);
  }, []);

  // Stable identity: a new seal arriving must not re-run every existing
  // seal's effect (which would duplicate haptics and restart removal timers).
  const removeSeal = useCallback((id: number) => {
    setSeals((current) => current.filter((seal) => seal.id !== id));
  }, []);

  return (
    <div className="seal-layer" aria-hidden="true">
      {seals.map((seal) => <Seal key={seal.id} seal={seal} onComplete={removeSeal} />)}
    </div>
  );
}
