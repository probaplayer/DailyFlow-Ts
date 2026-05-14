import { describe, expect, it } from 'vitest';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import {
  buildMonthDays,
  createDefaultTasksForSchedule,
  createScheduledTodoFlow,
  createTodoFlowFromTask,
  findAutoFitScheduleSlot,
  getScheduleSlotForDate,
  getDueNotificationItems,
  getDueSlotNotificationItems,
  getTodoScheduleDateKeys,
  getTodoTaskEstimatedSeconds,
  groupScheduledItemsByDate,
  groupScheduledItemsForDateRange,
  hasOverlappingScheduleSlot,
  isPastDateKey,
  listDateKeysBetween,
  moveScheduleSlotPreservingDuration,
  secondsBetweenTimeStrings,
  setTaskScheduleSlot,
  setTodoAssignedDate,
  setTodoScheduleSlot,
  unsetTodoAssignedDate,
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

  it('creates an empty TodoFlow for a selected calendar date', () => {
    const created = createScheduledTodoFlow('todo-1', '2026-05-13');

    expect(created.id).toBe('todo-1');
    expect(created.note).toBe('');
    expect(created.taskIds).toEqual([]);
    expect(created.tasks).toEqual({});
    expect(created.scheduledDate).toBe('2026-05-13');
    expect(created.status).toBe(TodoStatus.STOP);
    expect(created.timer).toBeNull();
  });

  it('creates an empty TodoFlow assigned to multiple selected calendar dates', () => {
    const created = createScheduledTodoFlow('todo-1', ['2026-05-13', '2026-05-14']);

    expect(created.scheduledDate).toBe('2026-05-13');
    expect(created.scheduledDates).toEqual(['2026-05-13', '2026-05-14']);
  });

  it('groups a multi-date TodoFlow into each assigned calendar date', () => {
    const grouped = groupScheduledItemsByDate(
      [{ ...todo('todo-1', 'Multi-day plan'), scheduledDates: ['2026-05-13', '2026-05-14'] }],
      []
    );

    expect(grouped['2026-05-13'].todos.map((item) => item.id)).toEqual(['todo-1']);
    expect(grouped['2026-05-14'].todos.map((item) => item.id)).toEqual(['todo-1']);
    expect(grouped.unscheduled.todos).toHaveLength(0);
  });

  it('returns assigned dates from scheduledDates before scheduledDate', () => {
    expect(
      getTodoScheduleDateKeys({
        ...todo('todo-1', 'Plan', '2026-05-12'),
        scheduledDates: ['2026-05-13', '2026-05-14'],
      })
    ).toEqual(['2026-05-13', '2026-05-14']);
  });

  it('returns assigned dates from TodoFlow schedule slots', () => {
    expect(
      getTodoScheduleDateKeys({
        ...todo('todo-1', 'Plan', '2026-05-12'),
        scheduleSlots: [
          { dateKey: '2026-05-14', startTime: '09:00', endTime: '10:30' },
          { dateKey: '2026-05-13', startTime: '08:00', endTime: '09:00' },
        ],
      })
    ).toEqual(['2026-05-13', '2026-05-14']);
  });

  it('adds a calendar date to an existing TodoFlow without replacing other assigned dates', () => {
    const updated = setTodoAssignedDate(
      { ...todo('todo-1', 'Plan', '2026-05-13'), scheduledDates: ['2026-05-13', '2026-05-14'] },
      '2026-05-15'
    );

    expect(updated.scheduledDate).toBe('2026-05-13');
    expect(updated.scheduledDates).toEqual(['2026-05-13', '2026-05-14', '2026-05-15']);
    expect(updated.lastNotifiedDate).toBeUndefined();
  });

  it('sets a TodoFlow schedule slot and updates estimated time from duration', () => {
    const updated = setTodoScheduleSlot(todo('todo-1', 'Plan'), {
      dateKey: '2026-05-13',
      startTime: '09:15',
      endTime: '11:45',
    });

    expect(updated.scheduleSlots).toEqual([
      { dateKey: '2026-05-13', startTime: '09:15', endTime: '11:45' },
    ]);
    expect(updated.scheduledDate).toBe('2026-05-13');
    expect(updated.estimatedTimeTodo).toBe(9000);
  });

  it('sets a Task schedule slot and updates estimated time from duration', () => {
    const updated = setTaskScheduleSlot(task('task-1', 'Email'), {
      dateKey: '2026-05-13',
      startTime: '13:00',
      endTime: '14:00',
    });

    expect(updated.scheduleSlots).toEqual([
      { dateKey: '2026-05-13', startTime: '13:00', endTime: '14:00' },
    ]);
    expect(updated.scheduledDate).toBe('2026-05-13');
    expect(updated.estimatedTime).toBe(3600);
  });

  it('finds a schedule slot by date', () => {
    const slot = getScheduleSlotForDate(
      [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '11:00', endTime: '12:00' },
      ],
      '2026-05-14'
    );

    expect(slot?.startTime).toBe('11:00');
  });

  it('calculates seconds between valid time strings', () => {
    expect(secondsBetweenTimeStrings('09:30', '11:00')).toBe(5400);
  });

  it('rejects end times that are not after start times', () => {
    expect(() => secondsBetweenTimeStrings('11:00', '11:00')).toThrow('End time must be after start time');
  });

  it('groups selected range items by the same id', () => {
    const sharedTodo = {
      ...todo('todo-1', 'Shared plan'),
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '10:00', endTime: '11:00' },
      ],
    };
    const sharedTask = {
      ...task('task-1', 'Shared task'),
      scheduleSlots: [
        { dateKey: '2026-05-14', startTime: '13:00', endTime: '14:00' },
        { dateKey: '2026-05-15', startTime: '13:00', endTime: '14:00' },
      ],
    };

    const grouped = groupScheduledItemsForDateRange(
      [sharedTodo],
      [sharedTask],
      ['2026-05-13', '2026-05-14']
    );

    expect(grouped.todos).toHaveLength(1);
    expect(grouped.todos[0].dateKeys).toEqual(['2026-05-13', '2026-05-14']);
    expect(grouped.tasks).toHaveLength(1);
    expect(grouped.tasks[0].dateKeys).toEqual(['2026-05-14']);
  });

  it('removes only the selected calendar date from a multi-date TodoFlow', () => {
    const updated = unsetTodoAssignedDate(
      { ...todo('todo-1', 'Plan', '2026-05-13'), scheduledDates: ['2026-05-13', '2026-05-14'] },
      '2026-05-13'
    );

    expect(updated.scheduledDate).toBe('2026-05-14');
    expect(updated.scheduledDates).toBeUndefined();
  });

  it('clears assignment when removing the last assigned date from a TodoFlow', () => {
    const updated = unsetTodoAssignedDate(todo('todo-1', 'Plan', '2026-05-13'), '2026-05-13');

    expect(updated.scheduledDate).toBeUndefined();
    expect(updated.scheduledDates).toBeUndefined();
    expect(updated.lastNotifiedDate).toBeUndefined();
  });

  it('detects calendar dates before today as past dates', () => {
    expect(isPastDateKey('2026-05-12', '2026-05-13')).toBe(true);
    expect(isPastDateKey('2026-05-13', '2026-05-13')).toBe(false);
    expect(isPastDateKey('2026-05-14', '2026-05-13')).toBe(false);
  });

  it('lists date keys between two selected calendar dates in order', () => {
    expect(listDateKeysBetween('2026-05-15', '2026-05-13')).toEqual([
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
    ]);
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

  it('returns slot notification items 15 minutes before start time', () => {
    const due = getDueSlotNotificationItems(
      [
        {
          ...todo('todo-1', 'Focus plan'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '10:00', endTime: '11:00' }],
        },
      ],
      [
        {
          ...task('task-1', 'Call client'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '10:15', endTime: '11:15' }],
        },
      ],
      new Date(2026, 4, 12, 9, 45)
    );

    expect(due.map((item) => item.id)).toEqual(['todo-1']);
  });

  it('does not return a slot notification twice for the same date and time', () => {
    const due = getDueSlotNotificationItems(
      [
        {
          ...todo('todo-1', 'Focus plan'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '10:00', endTime: '11:00' }],
          lastNotifiedDate: '2026-05-12T10:00',
        },
      ],
      [],
      new Date(2026, 4, 12, 9, 45)
    );

    expect(due).toHaveLength(0);
  });

  it('creates three default tasks whose total estimated time matches the selected duration', () => {
    const tasks = createDefaultTasksForSchedule(3600, ['task-1', 'task-2', 'task-3']);

    expect(tasks.map((item) => item.id)).toEqual(['task-1', 'task-2', 'task-3']);
    expect(tasks.map((item) => item.estimatedTime)).toEqual([1200, 1200, 1200]);
    expect(tasks.reduce((total, item) => total + item.estimatedTime, 0)).toBe(3600);
  });

  it('keeps default task durations balanced when selected duration is not divisible by three', () => {
    const tasks = createDefaultTasksForSchedule(3700, ['task-1', 'task-2', 'task-3']);

    expect(tasks.map((item) => item.estimatedTime)).toEqual([1234, 1233, 1233]);
    expect(tasks.reduce((total, item) => total + item.estimatedTime, 0)).toBe(3700);
  });

  it('detects overlapping schedule slots on the same date', () => {
    expect(
      hasOverlappingScheduleSlot(
        { dateKey: '2026-05-12', startTime: '09:30', endTime: '10:30' },
        [{ dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' }]
      )
    ).toBe(true);
  });

  it('allows adjacent or different-day schedule slots', () => {
    expect(
      hasOverlappingScheduleSlot(
        { dateKey: '2026-05-12', startTime: '10:00', endTime: '11:00' },
        [
          { dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' },
          { dateKey: '2026-05-13', startTime: '10:00', endTime: '11:00' },
        ]
      )
    ).toBe(false);
  });

  it('calculates TodoFlow task estimated duration from non-break tasks', () => {
    expect(
      getTodoTaskEstimatedSeconds({
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1', 'break-1', 'task-2'],
        tasks: {
          'task-1': task('task-1', 'First'),
          'break-1': { ...task('break-1', 'Break'), isTaskBreak: true, estimatedTime: 300 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 600 },
        },
      })
    ).toBe(720);
  });

  it('moves a schedule slot to a new start time without changing duration', () => {
    expect(
      moveScheduleSlotPreservingDuration(
        { dateKey: '2026-05-12', startTime: '09:30', endTime: '11:00' },
        '2026-05-13',
        '14:15'
      )
    ).toEqual({ dateKey: '2026-05-13', startTime: '14:15', endTime: '15:45' });
  });

  it('moves an overlapping slot to continue after the overlapping TodoFlow', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '09:30', endTime: '10:30' },
        [
          { dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' },
          { dateKey: '2026-05-12', startTime: '10:45', endTime: '11:15' },
        ]
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '11:15', endTime: '12:15' });
  });

  it('moves an overlapping slot before the conflict when continuing would pass the end of day', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '23:15', endTime: '23:45' },
        [{ dateKey: '2026-05-12', startTime: '23:00', endTime: '23:45' }]
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '22:30', endTime: '23:00' });
  });
});
