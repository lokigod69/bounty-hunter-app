import { useCallback, useEffect, useRef, useState } from 'react';
import { Coin } from './Coin';
import { PAYOUT_EVENT, type PayoutEventDetail } from '../../hooks/usePayoutWatcher';

interface Flight {
  id: number;
  payout: PayoutEventDetail;
  anchor: HTMLElement;
  rect: { left: number; top: number; width: number; height: number };
}

let flightSequence = 0;

function visibleCreditAnchor(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-credit-anchor]'))
    .find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) ?? null;
}

function PayoutFlight({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const coinRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const coin = coinRef.current;
    const ring = ringRef.current;
    if (!coin || !ring) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations: Animation[] = [];
    let landingTimer = 0;
    let doneTimer = 0;

    if (reduced) {
      animations.push(flight.anchor.animate(
        [{ opacity: 1 }, { opacity: 0.58 }, { opacity: 1 }],
        { duration: 200, easing: 'ease-out' }
      ));
      doneTimer = window.setTimeout(() => onDone(flight.id), 220);
    } else {
      const arc = Array.from({ length: 7 }, (_, index) => {
        const t = index / 6;
        const x = -88 * (1 - t);
        const y = -110 * (1 - t) - 50 * 4 * t * (1 - t);
        return {
          offset: t,
          opacity: t < 0.92 ? 1 : 1 - (t - 0.92) / 0.08,
          transform: `translate(${x}px, ${y}px) rotate(${180 * t}deg) scale(${1 - 0.58 * t})`,
        };
      });
      animations.push(coin.animate(arc, {
        duration: 620,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'forwards',
      }));

      landingTimer = window.setTimeout(() => {
        animations.push(flight.anchor.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.10)' },
            { transform: 'scale(1)' },
          ],
          { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
        ));
        animations.push(ring.animate(
          [
            { opacity: 0.7, transform: 'scale(0.86)' },
            { opacity: 0, transform: 'scale(1.65)' },
          ],
          { duration: 320, easing: 'ease-out', fill: 'forwards' }
        ));
      }, 560);
      doneTimer = window.setTimeout(() => onDone(flight.id), 900);
    }

    return () => {
      window.clearTimeout(landingTimer);
      window.clearTimeout(doneTimer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [flight, onDone]);

  const centerX = flight.rect.left + flight.rect.width / 2;
  const centerY = flight.rect.top + flight.rect.height / 2;

  return (
    <>
      <div
        ref={coinRef}
        className="payout-flight"
        data-payout-amount={flight.payout.amount}
        style={{ left: centerX - 12, top: centerY - 12 }}
      >
        <Coin size="xs" variant="static" label="¢" showValue={false} />
      </div>
      <div
        ref={ringRef}
        className="payout-badge-ring"
        style={{
          left: flight.rect.left,
          top: flight.rect.top,
          width: flight.rect.width,
          height: flight.rect.height,
        }}
      />
    </>
  );
}

export function PayoutCeremony() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    const handlePayout = (event: Event) => {
      const anchor = visibleCreditAnchor();
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const flight: Flight = {
        id: ++flightSequence,
        payout: (event as CustomEvent<PayoutEventDetail>).detail,
        anchor,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
      setFlights((current) => [...current.slice(-2), flight]);
    };
    window.addEventListener(PAYOUT_EVENT, handlePayout);
    return () => window.removeEventListener(PAYOUT_EVENT, handlePayout);
  }, []);

  const removeFlight = useCallback((id: number) => {
    setFlights((current) => current.filter((flight) => flight.id !== id));
  }, []);

  return (
    <div className="payout-ceremony-layer" aria-hidden="true">
      {flights.map((flight) => (
        <PayoutFlight key={flight.id} flight={flight} onDone={removeFlight} />
      ))}
    </div>
  );
}
