import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface ScheduledDayItems {
  todos: TodoFlow[];
  tasks: Task[];
}

export type ScheduledGroups = Record<string, ScheduledDayItems> & {
  unscheduled: ScheduledDayItems;
};

export type DueNotificationItem =
  | { type: 'todo'; id: string; title: string; item: TodoFlow }
  | { type: 'task'; id: string; title: string; item: Task };

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildMonthDays(monthDate: Date, today = new Date()): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const lastOfMonth = new Date(year, month + 1, 0);
  const end = new Date(lastOfMonth);
  end.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const days: CalendarDay[] = [];
  const cursor = new Date(start);
  const todayKey = toDateKey(today);

  while (cursor <= end) {
    const date = new Date(cursor);
    const dateKey = toDateKey(date);
    days.push({
      date,
      dateKey,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateKey === todayKey,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function emptyGroup(): ScheduledDayItems {
  return { todos: [], tasks: [] };
}

export function groupScheduledItemsByDate(todos: TodoFlow[], tasks: Task[]): ScheduledGroups {
  const groups = { unscheduled: emptyGroup() } as ScheduledGroups;

  for (const todo of todos) {
    const key = todo.scheduledDate || 'unscheduled';
    groups[key] ||= emptyGroup();
    groups[key].todos.push(todo);
  }

  for (const task of tasks) {
    const key = task.scheduledDate || 'unscheduled';
    groups[key] ||= emptyGroup();
    groups[key].tasks.push(task);
  }

  return groups;
}

export function createTodoFlowFromTask(task: Task, todoId: string, taskId: string): TodoFlow {
  const copiedTask: Task = {
    ...task,
    id: taskId,
    actualTime: 0,
    status: TaskStatus.NOT_STARTED,
    subTasks: task.subTasks.map((subTask) => ({ ...subTask })),
  };

  return {
    id: todoId,
    note: task.title || 'Scheduled task',
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: 1,
    estimatedTimeTodo: copiedTask.estimatedTime || 0,
    actualTimeTodo: 0,
    taskIds: [taskId],
    tasks: { [taskId]: copiedTask },
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
    scheduledDate: task.scheduledDate,
  };
}

export function getDueNotificationItems(
  todos: TodoFlow[],
  tasks: Task[],
  todayKey = toDateKey(new Date())
): DueNotificationItem[] {
  const dueTodos = todos
    .filter((todo) => todo.scheduledDate === todayKey && todo.lastNotifiedDate !== todayKey)
    .map((todo) => ({ type: 'todo' as const, id: todo.id, title: todo.note || 'TodoFlow', item: todo }));

  const dueTasks = tasks
    .filter((task) => task.scheduledDate === todayKey && task.lastNotifiedDate !== todayKey)
    .map((task) => ({ type: 'task' as const, id: task.id, title: task.title || 'Task', item: task }));

  return [...dueTodos, ...dueTasks];
}
