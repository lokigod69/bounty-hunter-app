import { describe, expect, it } from 'vitest';
import { computeNewStreakCount } from './contracts.domain';

describe('computeNewStreakCount', () => {
  it('starts a new streak when there is no previous completion', () => {
    expect(computeNewStreakCount(0, null, new Date('2026-06-11T12:00:00Z'))).toBe(1);
  });

  it('does not increment twice on the same UTC day', () => {
    expect(
      computeNewStreakCount(
        4,
        new Date('2026-06-11T01:00:00Z'),
        new Date('2026-06-11T23:00:00Z')
      )
    ).toBe(4);
  });

  it('increments when the last completion was yesterday', () => {
    expect(
      computeNewStreakCount(
        4,
        new Date('2026-06-10T23:59:00Z'),
        new Date('2026-06-11T00:01:00Z')
      )
    ).toBe(5);
  });

  it('resets when there is a missed day', () => {
    expect(
      computeNewStreakCount(
        4,
        new Date('2026-06-09T23:59:00Z'),
        new Date('2026-06-11T00:01:00Z')
      )
    ).toBe(1);
  });
});
