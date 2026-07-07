import { describe, expect, it } from 'vitest';
import { computeNewStreakCount, evaluateStatusChange } from './contracts.domain';
import type { StatusChangeContext } from './contracts.types';

const CREATOR = 'creator-1';
const ASSIGNEE = 'assignee-1';

function ctx(overrides: Partial<StatusChangeContext>): StatusChangeContext {
  return {
    actorId: ASSIGNEE,
    contractOwnerId: CREATOR,
    assigneeId: ASSIGNEE,
    currentStatus: 'review',
    requestedStatus: 'review',
    proofRequired: true,
    ...overrides,
  };
}

describe('evaluateStatusChange - rejection loop (Phase 2.3)', () => {
  it('lets the creator reject a task that is in review', () => {
    const result = evaluateStatusChange(
      ctx({ actorId: CREATOR, currentStatus: 'review', requestedStatus: 'rejected' })
    );
    expect(result.allowed).toBe(true);
    expect(result.newStatus).toBe('rejected');
  });

  it('forbids the creator from rejecting a task that is not in review', () => {
    const result = evaluateStatusChange(
      ctx({ actorId: CREATOR, currentStatus: 'pending', requestedStatus: 'rejected' })
    );
    expect(result.allowed).toBe(false);
  });

  it('lets the assignee resubmit a rejected task for review', () => {
    const result = evaluateStatusChange(
      ctx({ actorId: ASSIGNEE, currentStatus: 'rejected', requestedStatus: 'review', proofRequired: true })
    );
    expect(result.allowed).toBe(true);
    expect(result.newStatus).toBe('review');
  });

  it('auto-completes a rejected resubmission when proof is not required', () => {
    const result = evaluateStatusChange(
      ctx({ actorId: ASSIGNEE, currentStatus: 'rejected', requestedStatus: 'review', proofRequired: false })
    );
    expect(result.allowed).toBe(true);
    expect(result.newStatus).toBe('completed');
  });

  it('lets the assignee restart a rejected task to in_progress', () => {
    const result = evaluateStatusChange(
      ctx({ actorId: ASSIGNEE, currentStatus: 'rejected', requestedStatus: 'in_progress' })
    );
    expect(result.allowed).toBe(true);
    expect(result.newStatus).toBe('in_progress');
  });
});

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
