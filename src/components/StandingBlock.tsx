// src/components/StandingBlock.tsx
// Design V2 Wave 2 (THE REGISTER §3.1): the second number in the rail.
// Sigil + rank word + a 2px bar filling toward the next band. Presentational —
// Layout owns the single useStanding fetch and passes it in, so the desktop
// and mobile instances never race each other.
//
// UNSWORN renders no bar (a zero bar is the worst possible first run); the
// tooltip carries the recruitment line instead.

import { useTranslation } from 'react-i18next';
import { standingRankKey, type Standing } from '../core/credits/standing.domain';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { StandingSigil } from './visual/StandingSigil';

interface StandingBlockProps {
  standing: Standing;
  known: boolean;
  /** Sigil only — for the tight mobile header row. */
  compact?: boolean;
}

export function StandingBlock({ standing, known, compact = false }: StandingBlockProps) {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();

  // Never show a wrong rank while loading — absence beats a lie.
  if (!known) return null;

  const rankWord = strings[standingRankKey(standing.band)];
  const detail =
    standing.band === 0
      ? t('standing.unsworn')
      : standing.nextThreshold === null
        ? rankWord
        : t('standing.progressToNext', {
            earned: standing.earned.toLocaleString(),
            next: standing.nextThreshold.toLocaleString(),
          });

  return (
    <div
      className="standing-block"
      title={detail}
      aria-label={`${t('standing.label')}: ${rankWord}. ${detail}`}
    >
      <StandingSigil band={standing.band} size={22} />
      {!compact && (
        <div className="standing-meta">
          <span className="standing-rank">{rankWord}</span>
          {standing.band > 0 && standing.nextThreshold !== null && (
            <span className="standing-bar">
              <span
                className="standing-bar-fill"
                style={{ width: `${Math.round(standing.progress * 100)}%` }}
              />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StandingBlock;
