import { describe, expect, it } from 'vitest';
import { mapTaskStatusToModalState, stateConfig } from './modalTheme';

describe('mapTaskStatusToModalState', () => {
  it('keeps accepted work visibly in progress', () => {
    expect(mapTaskStatusToModalState('in_progress')).toBe('in_progress');
    expect(stateConfig.in_progress.labelKey).toBe('taskStatus.inProgress');
  });
  it('keeps sent-back work distinct from overdue work', () => {
    expect(mapTaskStatusToModalState('rejected')).toBe('rejected');
    expect(stateConfig.rejected.color).toBe('#f97316');
  });
});
