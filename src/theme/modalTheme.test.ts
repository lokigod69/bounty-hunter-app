import { describe, expect, it } from 'vitest';
import { mapTaskStatusToModalState, stateConfig } from './modalTheme';

describe('mapTaskStatusToModalState', () => {
  it('keeps sent-back work distinct from overdue work', () => {
    expect(mapTaskStatusToModalState('rejected')).toBe('rejected');
    expect(stateConfig.rejected.color).toBe('#f97316');
  });
});
