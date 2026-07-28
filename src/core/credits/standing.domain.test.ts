import { describe, expect, it } from 'vitest';
import { getStanding, standingRankKey, STANDING_THRESHOLDS } from './standing.domain';

describe('getStanding', () => {
  it('places a brand-new hunter at UNSWORN with a full path ahead', () => {
    expect(getStanding(0)).toEqual({
      band: 0,
      earned: 0,
      currentThreshold: 0,
      nextThreshold: 120,
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
    expect(getStanding(119).band).toBe(0);
    expect(getStanding(120).band).toBe(1);
    expect(getStanding(599).band).toBe(1);
    expect(getStanding(600).band).toBe(2);
    expect(getStanding(1999).band).toBe(2);
    expect(getStanding(2000).band).toBe(3);
    expect(getStanding(7999).band).toBe(3);
    expect(getStanding(8000).band).toBe(4);
  });

  it('measures progress within the current band', () => {
    // DRIFTER at 360: (360 - 120) / (600 - 120) = 0.5
    expect(getStanding(360).progress).toBe(0.5);
    expect(getStanding(120).progress).toBe(0);
  });

  it('caps the top band at full progress with no next threshold', () => {
    const named = getStanding(20000);
    expect(named.band).toBe(4);
    expect(named.nextThreshold).toBeNull();
    expect(named.progress).toBe(1);
  });

  it('floors fractional earnings before banding', () => {
    expect(getStanding(119.9).band).toBe(0);
    expect(getStanding(119.9).earned).toBe(119);
  });

  it('unlocks the creed progressively: 1, 2, 4, 6, then all 7 lines', () => {
    expect(getStanding(0).unlockedCreedLines).toBe(1);
    expect(getStanding(120).unlockedCreedLines).toBe(2);
    expect(getStanding(600).unlockedCreedLines).toBe(4);
    expect(getStanding(2000).unlockedCreedLines).toBe(6);
    expect(getStanding(8000).unlockedCreedLines).toBe(7);
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
