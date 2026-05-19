import { describe, expect, it } from 'vitest';
import todoReducer, { setStartTimer, setStopTimer, setTimeLeft } from './todoSlice';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';

const buildRunningTodo = (): TodoFlow => ({
  id: 'todo-1',
  note: 'Todo',
  status: TodoStatus.START_ON_TODO,
  taskCompleted: 0,
  taskTotal: 1,
  estimatedTimeTodo: 60,
  actualTimeTodo: 7,
  taskIds: ['task-1'],
  tasks: {
    'task-1': {
      id: 'task-1',
      title: 'Task',
      estimatedTime: 60,
      actualTime: 7,
      subTasks: [],
      status: TaskStatus.IN_PROGRESS,
    },
  },
  currentTaskId: 'task-1',
  timeLeft: 7,
  timer: null,
});

describe('todoSlice timer ticks', () => {
  it('ignores automatic timer ticks when no timer is active', () => {
    const previous = buildRunningTodo();

    const next = todoReducer(previous, setTimeLeft(undefined));

    expect(next.timeLeft).toBe(7);
    expect(next.actualTimeTodo).toBe(7);
    expect(next.tasks['task-1'].actualTime).toBe(7);
  });

  it('still applies explicit time updates when no timer is active', () => {
    const previous = buildRunningTodo();

    const next = todoReducer(previous, setTimeLeft(12));

    expect(next.timeLeft).toBe(12);
    expect(next.tasks['task-1'].actualTime).toBe(12);
  });

  it('applies automatic timer ticks after starting with timer id zero', () => {
    const started = todoReducer(buildRunningTodo(), setStartTimer(0 as unknown as NodeJS.Timeout));

    const next = todoReducer(started, setTimeLeft(undefined));

    expect(next.timeLeft).toBe(8);
    expect(next.actualTimeTodo).toBe(8);
    expect(next.tasks['task-1'].actualTime).toBe(8);
  });

  it('stops a running timer when the active timer id is zero', () => {
    const started = todoReducer(buildRunningTodo(), setStartTimer(0 as unknown as NodeJS.Timeout));

    const next = todoReducer(started, setStopTimer());

    expect(next.timer).toBeNull();
    expect(next.tasks['task-1'].status).toBe(TaskStatus.PAUSED);
  });
});
