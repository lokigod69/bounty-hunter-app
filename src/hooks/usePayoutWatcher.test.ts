import { describe, expect, it } from 'vitest';
import { detectPayouts, type PayoutTaskRow } from './usePayoutWatcher';

const row = (overrides: Partial<PayoutTaskRow> = {}): PayoutTaskRow => ({
  id: 'task-1',
  status: 'completed',
  reward_type: 'credit',
  reward_text: '25',
  ...overrides,
});

describe('detectPayouts', () => {
  it('detects a credit task moving from review to completed', () => {
    const previous = new Map([['task-1', 'review']]);

    expect(detectPayouts(previous, [row()])).toEqual([
      { taskId: 'task-1', amount: 25 },
    ]);
    expect(previous.get('task-1')).toBe('review');
  });

  it('does not emit completed rows that were absent from the baseline', () => {
    expect(detectPayouts(new Map(), [row()])).toEqual([]);
  });

  it('ignores non-credit rewards and transitions other than review to completed', () => {
    const previous = new Map([
      ['gift-task', 'review'],
      ['already-complete', 'completed'],
      ['still-review', 'review'],
    ]);

    expect(detectPayouts(previous, [
      row({ id: 'gift-task', reward_type: 'text' }),
      row({ id: 'already-complete' }),
      row({ id: 'still-review', status: 'review' }),
    ])).toEqual([]);
  });

  it('ignores missing, invalid, or non-positive credit amounts', () => {
    const previous = new Map([
      ['missing', 'review'],
      ['invalid', 'review'],
      ['zero', 'review'],
    ]);

    expect(detectPayouts(previous, [
      row({ id: 'missing', reward_text: null }),
      row({ id: 'invalid', reward_text: 'credits' }),
      row({ id: 'zero', reward_text: '0' }),
    ])).toEqual([]);
  });
});
