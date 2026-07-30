import { describe, expect, it } from 'vitest';
import { getStanding, standingRankKey, STANDING_THRESHOLDS } from './standing.domain';

describe('getStanding', () => {
  it('places a brand-new hunter at UNSWORN with a full path ahead', () => {
    expect(getStanding(0)).toEqual({
      band: 0,
      earned: 0,
      currentThreshold: 0,
      nextThreshold: 30,
      progress: 0,
      unlockedCreedLines: 1,
    });
  });

  it('treats missing or corrupt input as zero standing', () => {
    expect(getStanding(null).band).toBe(0);
    expect(getStanding(undefined).band).toBe(0);
    expect(getStanding(Number.NaN).band).toBe(0);
    expect(getStanding(Number.POSITIVE_INFINITY).band).toBe(0);
    expect(getStanding(-500).earned).toBe(0);
  });

  it('promotes exactly at each threshold, not one credit before', () => {
    expect(getStanding(29).band).toBe(0);
    expect(getStanding(30).band).toBe(1);
    expect(getStanding(149).band).toBe(1);
    expect(getStanding(150).band).toBe(2);
    expect(getStanding(599).band).toBe(2);
    expect(getStanding(600).band).toBe(3);
    expect(getStanding(1999).band).toBe(3);
    expect(getStanding(2000).band).toBe(4);
  });

  it('measures progress within the current band', () => {
    // DRIFTER at 90: (90 - 30) / (150 - 30) = 0.5
    expect(getStanding(90).progress).toBe(0.5);
    expect(getStanding(30).progress).toBe(0);
  });

  it('caps the top band at full progress with no next threshold', () => {
    const named = getStanding(20000);
    expect(named.band).toBe(4);
    expect(named.nextThreshold).toBeNull();
    expect(named.progress).toBe(1);
  });

  it('floors fractional earnings before banding', () => {
    expect(getStanding(29.9).band).toBe(0);
    expect(getStanding(29.9).earned).toBe(29);
  });

  it('unlocks the creed progressively: 1, 2, 4, 6, then all 7 lines', () => {
    expect(getStanding(0).unlockedCreedLines).toBe(1);
    expect(getStanding(30).unlockedCreedLines).toBe(2);
    expect(getStanding(150).unlockedCreedLines).toBe(4);
    expect(getStanding(600).unlockedCreedLines).toBe(6);
    expect(getStanding(2000).unlockedCreedLines).toBe(7);
  });

  it('keeps every band reachable at the rate the app actually offers', () => {
    // TaskForm offers 1/2/3/5/10 credits and calls 2 a "small chore", so the
    // realistic average contract is ~3 credits. The old table (max 8000)
    // needed ~2,667 contracts for the top band; guard against drifting back.
    const AVERAGE_CONTRACT_CREDITS = 3;
    const topBandContracts = STANDING_THRESHOLDS[4] / AVERAGE_CONTRACT_CREDITS;
    expect(topBandContracts).toBeLessThanOrEqual(700);
  });
});

describe('standingRankKey', () => {
  it('maps every band to its ThemeStrings key', () => {
    expect(standingRankKey(0)).toBe('rankBand0');
    expect(standingRankKey(4)).toBe('rankBand4');
  });
});

describe('STANDING_THRESHOLDS', () => {
  it('is strictly ascending and starts at zero', () => {
    expect(STANDING_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < STANDING_THRESHOLDS.length; i++) {
      expect(STANDING_THRESHOLDS[i]).toBeGreaterThan(STANDING_THRESHOLDS[i - 1]);
    }
  });
});
