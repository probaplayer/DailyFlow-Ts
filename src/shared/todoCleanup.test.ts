import { describe, expect, it } from 'vitest';
import {
  getAssignedTodoCutoffDateKey,
  getTodoAssignedDateKeys,
  splitExpiredAssignedTodos,
} from './todoCleanup';

describe('todoCleanup', () => {
  it('calculates the assigned TodoFlow cleanup cutoff one month before today', () => {
    expect(getAssignedTodoCutoffDateKey(new Date('2026-05-18T10:00:00'))).toBe('2026-04-18');
  });

  it('clamps the cutoff to the last day of the previous month', () => {
    expect(getAssignedTodoCutoffDateKey(new Date('2026-05-31T10:00:00'))).toBe('2026-04-30');
  });

  it('reads assigned dates from legacy dates, multi-date assignments, and schedule slots', () => {
    expect(
      getTodoAssignedDateKeys({
        scheduledDate: '2026-04-10',
        scheduledDates: ['2026-04-11', '2026-04-10'],
        scheduleSlots: [{ dateKey: '2026-04-12', startTime: '09:00', endTime: '10:00' }],
      })
    ).toEqual(['2026-04-10', '2026-04-11', '2026-04-12']);
  });

  it('expires assigned TodoFlows only when all assigned dates are older than the cutoff', () => {
    const expired = { id: 'expired', scheduledDates: ['2026-04-01', '2026-04-10'] };
    const mixed = { id: 'mixed', scheduledDates: ['2026-04-01', '2026-04-18'] };
    const unscheduled = { id: 'unscheduled' };

    expect(splitExpiredAssignedTodos([expired, mixed, unscheduled], new Date('2026-05-18T10:00:00'))).toEqual({
      activeTodos: [mixed, unscheduled],
      expiredTodos: [expired],
    });
  });
});
