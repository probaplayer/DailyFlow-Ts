import { describe, expect, it } from 'vitest';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import {
  buildMonthDays,
  createTodoFlowFromTask,
  getDueNotificationItems,
  groupScheduledItemsByDate,
  toDateKey,
} from './scheduleUtils';

const task = (id: string, title: string, scheduledDate?: string): Task => ({
  id,
  title,
  estimatedTime: 120,
  actualTime: 0,
  status: TaskStatus.NOT_STARTED,
  subTasks: [],
  scheduledDate,
});

const todo = (id: string, note: string, scheduledDate?: string): TodoFlow => ({
  id,
  note,
  status: TodoStatus.STOP,
  taskCompleted: 0,
  taskTotal: 0,
  estimatedTimeTodo: 120,
  actualTimeTodo: 0,
  taskIds: [],
  tasks: {},
  timeLeft: 0,
  timer: null,
  scheduledDate,
});

describe('scheduleUtils', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 4, 12))).toBe('2026-05-12');
  });

  it('builds a month grid including leading and trailing days', () => {
    const days = buildMonthDays(new Date(2026, 4, 12));
    expect(days.length).toBeGreaterThanOrEqual(35);
    expect(days[0].dateKey).toBe('2026-04-26');
    expect(days.some((day) => day.dateKey === '2026-05-12' && day.isCurrentMonth)).toBe(true);
  });

  it('groups scheduled todos and standalone tasks by date', () => {
    const grouped = groupScheduledItemsByDate(
      [todo('todo-1', 'Write report', '2026-05-12')],
      [task('task-1', 'Email client', '2026-05-12'), task('task-2', 'Backlog')]
    );

    expect(grouped['2026-05-12'].todos).toHaveLength(1);
    expect(grouped['2026-05-12'].tasks).toHaveLength(1);
    expect(grouped.unscheduled.tasks).toHaveLength(1);
  });

  it('creates a new TodoFlow from a standalone task without mutating the original task', () => {
    const original = task('task-1', 'Email client', '2026-05-12');
    const created = createTodoFlowFromTask(original, 'todo-1', 'new-task-1');

    expect(created.id).toBe('todo-1');
    expect(created.note).toBe('Email client');
    expect(created.taskIds).toEqual(['new-task-1']);
    expect(created.tasks['new-task-1'].title).toBe('Email client');
    expect(created.tasks['new-task-1'].status).toBe(TaskStatus.NOT_STARTED);
    expect(created.tasks['new-task-1'].actualTime).toBe(0);
    expect(original.id).toBe('task-1');
  });

  it('returns due notification items that have not been notified today', () => {
    const due = getDueNotificationItems(
      [
        todo('todo-1', 'Today plan', '2026-05-12'),
        { ...todo('todo-2', 'Already notified', '2026-05-12'), lastNotifiedDate: '2026-05-12' },
      ],
      [
        task('task-1', 'Today task', '2026-05-12'),
        task('task-2', 'Tomorrow task', '2026-05-13'),
      ],
      '2026-05-12'
    );

    expect(due.map((item) => item.id)).toEqual(['todo-1', 'task-1']);
  });
});
