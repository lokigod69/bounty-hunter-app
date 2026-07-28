// src/components/visual/RankUpCeremony.tsx
// THE REGISTER §3.1: rank-up is the only ceremony in the app over one second,
// and it happens roughly four times in a user's life. Board dims → the sigil
// cross-fades its metal at 96px → an accent ring expands → the rank word
// wipes in → the earned subline fades up. Dismiss on tap or 3.5s.
//
// Mounted once in Layout next to PayoutCeremony. Triggered by RANK_UP_EVENT
// from useRankUpWatcher; if two rank-ups land in one session the newest wins.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { standingRankKey } from '../../core/credits/standing.domain';
import { RANK_UP_EVENT, type RankUpEventDetail } from '../../hooks/useStanding';
import { useThemeStrings } from '../../hooks/useThemeStrings';
import { feedback } from '../../utils/feedback';
import { StandingSigil } from './StandingSigil';

const HOLD_MS = 3500;
// Reduced motion loses the dim animation, rotation, ring and wipe — so the
// hold is LONGER than the full ceremony, never shorter: fewer cues must never
// mean less reading time (Codex session review, finding 3).
const HOLD_REDUCED_MS = 4500;

export function RankUpCeremony() {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  const [detail, setDetail] = useState<RankUpEventDetail | null>(null);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    const onRankUp = (event: Event) => {
      const next = (event as CustomEvent<RankUpEventDetail>).detail;
      if (!next) return;
      setDetail(next);
      feedback.rankUp();
    };
    window.addEventListener(RANK_UP_EVENT, onRankUp);
    return () => window.removeEventListener(RANK_UP_EVENT, onRankUp);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    dismissTimer.current = window.setTimeout(
      () => setDetail(null),
      reduced ? HOLD_REDUCED_MS : HOLD_MS
    );
    return () => {
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    };
  }, [detail]);

  if (!detail) return null;

  const rankWord = strings[standingRankKey(detail.band)];

  return (
    <div className="rankup-layer" role="status" onClick={() => setDetail(null)}>
      <div className="rankup-dim" />
      <div className="rankup-card">
        <div className="rankup-sigil-wrap">
          <span className="rankup-ring" />
          <StandingSigil band={detail.band} size={96} />
        </div>
        <div className="rankup-word">{rankWord}</div>
        <div className="rankup-subline">
          {detail.earned.toLocaleString()} {t('standing.earnedSuffix')}
        </div>
      </div>
    </div>
  );
}

export default RankUpCeremony;
