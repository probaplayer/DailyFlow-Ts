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

export interface ScheduledRangeItem<T> {
  item: T;
  dateKeys: string[];
  slots: ScheduleSlot[];
}

export interface ScheduledRangeItems {
  todos: ScheduledRangeItem<TodoFlow>[];
  tasks: ScheduledRangeItem<Task>[];
}

export type ScheduledGroups = Record<string, ScheduledDayItems> & {
  unscheduled: ScheduledDayItems;
};

export type DueNotificationItem =
  | { type: 'todo'; id: string; title: string; item: TodoFlow }
  | { type: 'task'; id: string; title: string; item: Task };

export type DueSlotNotificationItem = DueNotificationItem & {
  slot: ScheduleSlot;
  notificationKey: string;
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isPastDateKey(dateKey: string, todayKey = toDateKey(new Date())): boolean {
  return dateKey < todayKey;
}

export function listDateKeysBetween(startDateKey: string, endDateKey: string): string[] {
  const start = parseDateKey(startDateKey <= endDateKey ? startDateKey : endDateKey);
  const end = parseDateKey(startDateKey <= endDateKey ? endDateKey : startDateKey);
  const keys: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
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

function uniqueSortedDateKeys(dateKeys: string[]): string[] {
  return Array.from(new Set(dateKeys)).sort();
}

function getScheduleSlotDateKeys(slots?: ScheduleSlot[]): string[] {
  return uniqueSortedDateKeys((slots || []).map((slot) => slot.dateKey));
}

export function getTodoScheduleDateKeys(todo: TodoFlow): string[] {
  const slotDateKeys = getScheduleSlotDateKeys(todo.scheduleSlots);
  if (slotDateKeys.length > 0) {
    return slotDateKeys;
  }
  if (todo.scheduledDates && todo.scheduledDates.length > 0) {
    return uniqueSortedDateKeys(todo.scheduledDates);
  }
  return todo.scheduledDate ? [todo.scheduledDate] : [];
}

export function getTaskScheduleDateKeys(task: Task): string[] {
  const slotDateKeys = getScheduleSlotDateKeys(task.scheduleSlots);
  if (slotDateKeys.length > 0) {
    return slotDateKeys;
  }
  return task.scheduledDate ? [task.scheduledDate] : [];
}

function applyTodoScheduleDateKeys(todo: TodoFlow, dateKeys: string[]): TodoFlow {
  const uniqueDateKeys = uniqueSortedDateKeys(dateKeys);
  const scheduleSlots = (todo.scheduleSlots || []).filter((slot) => uniqueDateKeys.includes(slot.dateKey));

  return {
    ...todo,
    scheduledDate: uniqueDateKeys[0],
    scheduledDates: uniqueDateKeys.length > 1 ? uniqueDateKeys : undefined,
    scheduleSlots: scheduleSlots.length > 0 ? scheduleSlots : undefined,
    lastNotifiedDate: undefined,
  };
}

export function setTodoAssignedDate(todo: TodoFlow, dateKey: string): TodoFlow {
  return applyTodoScheduleDateKeys(todo, [...getTodoScheduleDateKeys(todo), dateKey]);
}

export function unsetTodoAssignedDate(todo: TodoFlow, dateKey: string): TodoFlow {
  return applyTodoScheduleDateKeys(
    todo,
    getTodoScheduleDateKeys(todo).filter((assignedDateKey) => assignedDateKey !== dateKey)
  );
}

function parseTimeString(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error('Time must use HH:mm format');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error('Time must use HH:mm format');
  }

  return hours * 3600 + minutes * 60;
}

export function secondsBetweenTimeStrings(startTime: string, endTime: string): number {
  const startSeconds = parseTimeString(startTime);
  const endSeconds = parseTimeString(endTime);
  const duration = endSeconds - startSeconds;
  if (duration <= 0) {
    throw new Error('End time must be after start time');
  }
  return duration;
}

export function hasOverlappingScheduleSlot(slot: ScheduleSlot, existingSlots: ScheduleSlot[]): boolean {
  const start = parseTimeString(slot.startTime);
  const end = parseTimeString(slot.endTime);

  return existingSlots.some((existing) => {
    if (existing.dateKey !== slot.dateKey) {
      return false;
    }

    const existingStart = parseTimeString(existing.startTime);
    const existingEnd = parseTimeString(existing.endTime);
    return start < existingEnd && end > existingStart;
  });
}

function timeStringFromSeconds(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.min(24 * 60, Math.floor(totalSeconds / 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(Math.min(hours, 23)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function secondsFromMidnightToTimeString(totalSeconds: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 * 60, totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  return `${String(Math.min(hours, 23)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function moveScheduleSlotPreservingDuration(
  slot: ScheduleSlot,
  dateKey: string,
  startTime: string
): ScheduleSlot {
  const durationSeconds = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const endSeconds = parseTimeString(startTime) + durationSeconds;
  return {
    dateKey,
    startTime,
    endTime: timeStringFromSeconds(endSeconds),
  };
}

export function findAutoFitScheduleSlot(slot: ScheduleSlot, existingSlots: ScheduleSlot[]): ScheduleSlot | null {
  const durationSeconds = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const dayEndSeconds = 24 * 60 * 60;
  const sameDaySlots = existingSlots
    .filter((existing) => existing.dateKey === slot.dateKey)
    .sort((a, b) => parseTimeString(a.startTime) - parseTimeString(b.startTime));

  const buildSlot = (startSeconds: number): ScheduleSlot => ({
    dateKey: slot.dateKey,
    startTime: secondsFromMidnightToTimeString(startSeconds),
    endTime: secondsFromMidnightToTimeString(startSeconds + durationSeconds),
  });

  let candidateStart = parseTimeString(slot.startTime);
  for (const existing of sameDaySlots) {
    const candidate = buildSlot(candidateStart);
    if (!hasOverlappingScheduleSlot(candidate, [existing])) {
      continue;
    }
    candidateStart = parseTimeString(existing.endTime);
  }

  const afterCandidate = buildSlot(candidateStart);
  if (candidateStart + durationSeconds <= dayEndSeconds && !hasOverlappingScheduleSlot(afterCandidate, sameDaySlots)) {
    return afterCandidate;
  }

  for (let index = sameDaySlots.length - 1; index >= 0; index -= 1) {
    const gapEnd = parseTimeString(sameDaySlots[index].startTime);
    const gapStart = index === 0 ? 0 : parseTimeString(sameDaySlots[index - 1].endTime);
    if (gapEnd - gapStart >= durationSeconds) {
      return buildSlot(gapEnd - durationSeconds);
    }
  }

  if (dayEndSeconds >= durationSeconds && sameDaySlots.length === 0) {
    return afterCandidate;
  }

  return null;
}

export function getTodoTaskEstimatedSeconds(todo: TodoFlow): number {
  return todo.taskIds.reduce((total, taskId) => {
    const task = todo.tasks[taskId];
    if (!task || task.isTaskBreak) {
      return total;
    }
    return total + (task.estimatedTime || 0);
  }, 0);
}

export function getScheduleSlotForDate(slots: ScheduleSlot[] | undefined, dateKey: string): ScheduleSlot | undefined {
  return slots?.find((slot) => slot.dateKey === dateKey);
}

function applyScheduleSlot(slots: ScheduleSlot[] | undefined, nextSlot: ScheduleSlot): ScheduleSlot[] {
  return [...(slots || []).filter((slot) => slot.dateKey !== nextSlot.dateKey), nextSlot].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );
}

export function setTodoScheduleSlot(todo: TodoFlow, slot: ScheduleSlot): TodoFlow {
  const duration = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const scheduleSlots = applyScheduleSlot(todo.scheduleSlots, slot);
  const dateKeys = getScheduleSlotDateKeys(scheduleSlots);

  return {
    ...todo,
    scheduleSlots,
    scheduledDate: dateKeys[0],
    scheduledDates: dateKeys.length > 1 ? dateKeys : undefined,
    estimatedTimeTodo: duration,
    lastNotifiedDate: undefined,
  };
}

export function setTaskScheduleSlot(task: Task, slot: ScheduleSlot): Task {
  const duration = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const scheduleSlots = applyScheduleSlot(task.scheduleSlots, slot);
  const dateKeys = getScheduleSlotDateKeys(scheduleSlots);

  return {
    ...task,
    scheduleSlots,
    scheduledDate: dateKeys[0],
    estimatedTime: duration,
    lastNotifiedDate: undefined,
  };
}

export function unsetTaskAssignedDate(task: Task, dateKey: string): Task {
  const scheduleSlots = (task.scheduleSlots || []).filter((slot) => slot.dateKey !== dateKey);
  const remainingDateKeys =
    scheduleSlots.length > 0
      ? getScheduleSlotDateKeys(scheduleSlots)
      : getTaskScheduleDateKeys(task).filter((assignedDateKey) => assignedDateKey !== dateKey);

  return {
    ...task,
    scheduledDate: remainingDateKeys[0],
    scheduleSlots: scheduleSlots.length > 0 ? scheduleSlots : undefined,
    lastNotifiedDate: undefined,
  };
}

export function groupScheduledItemsByDate(todos: TodoFlow[], tasks: Task[]): ScheduledGroups {
  const groups = { unscheduled: emptyGroup() } as ScheduledGroups;

  for (const todo of todos) {
    const dateKeys = getTodoScheduleDateKeys(todo);
    if (dateKeys.length === 0) {
      groups.unscheduled.todos.push(todo);
    } else {
      for (const key of dateKeys) {
        groups[key] ||= emptyGroup();
        groups[key].todos.push(todo);
      }
    }
  }

  for (const task of tasks) {
    const dateKeys = getTaskScheduleDateKeys(task);
    if (dateKeys.length === 0) {
      groups.unscheduled.tasks.push(task);
    } else {
      for (const key of dateKeys) {
        groups[key] ||= emptyGroup();
        groups[key].tasks.push(task);
      }
    }
  }

  return groups;
}

export function groupScheduledItemsForDateRange(
  todos: TodoFlow[],
  tasks: Task[],
  selectedDateKeys: string[]
): ScheduledRangeItems {
  const selected = new Set(selectedDateKeys);

  return {
    todos: todos
      .map((item) => {
        const dateKeys = getTodoScheduleDateKeys(item).filter((dateKey) => selected.has(dateKey));
        return {
          item,
          dateKeys,
          slots: (item.scheduleSlots || []).filter((slot) => selected.has(slot.dateKey)),
        };
      })
      .filter((group) => group.dateKeys.length > 0),
    tasks: tasks
      .map((item) => {
        const dateKeys = getTaskScheduleDateKeys(item).filter((dateKey) => selected.has(dateKey));
        return {
          item,
          dateKeys,
          slots: (item.scheduleSlots || []).filter((slot) => selected.has(slot.dateKey)),
        };
      })
      .filter((group) => group.dateKeys.length > 0),
  };
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
    scheduleSlots: task.scheduleSlots ? task.scheduleSlots.map((slot) => ({ ...slot })) : undefined,
  };
}

export function createScheduledTodoFlow(todoId: string, scheduledDate: string | string[]): TodoFlow {
  const scheduledDates = Array.isArray(scheduledDate) ? scheduledDate : [scheduledDate];

  return {
    id: todoId,
    note: '',
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: 0,
    estimatedTimeTodo: 0,
    actualTimeTodo: 0,
    taskIds: [],
    tasks: {},
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
    scheduledDate: scheduledDates[0],
    scheduledDates: scheduledDates.length > 1 ? scheduledDates : undefined,
  };
}

export function createDefaultTasksForSchedule(totalEstimatedSeconds: number, taskIds: string[]): Task[] {
  const safeTotal = Math.max(0, Math.floor(totalEstimatedSeconds));
  const ids = taskIds.slice(0, 3);
  const baseDuration = Math.floor(safeTotal / ids.length);
  let remainder = safeTotal - baseDuration * ids.length;

  return ids.map((id, index) => {
    const estimatedTime = baseDuration + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    return {
      id,
      title: `Task ${index + 1}`,
      estimatedTime,
      actualTime: 0,
      status: TaskStatus.NOT_STARTED,
      subTasks: [],
    };
  });
}

export function getDueNotificationItems(
  todos: TodoFlow[],
  tasks: Task[],
  todayKey = toDateKey(new Date())
): DueNotificationItem[] {
  const dueTodos = todos
    .filter((todo) => getTodoScheduleDateKeys(todo).includes(todayKey) && todo.lastNotifiedDate !== todayKey)
    .map((todo) => ({ type: 'todo' as const, id: todo.id, title: todo.note || 'TodoFlow', item: todo }));

  const dueTasks = tasks
    .filter((task) => task.scheduledDate === todayKey && task.lastNotifiedDate !== todayKey)
    .map((task) => ({ type: 'task' as const, id: task.id, title: task.title || 'Task', item: task }));

  return [...dueTodos, ...dueTasks];
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function startMinutesFromSlot(slot: ScheduleSlot): number {
  const [hours, minutes] = slot.startTime.split(':').map(Number);
  return hours * 60 + minutes;
}

function isSlotDueForReminder(slot: ScheduleSlot, now: Date, reminderMinutes: number): boolean {
  if (slot.dateKey !== toDateKey(now)) {
    return false;
  }

  return startMinutesFromSlot(slot) - minutesSinceMidnight(now) === reminderMinutes;
}

function getSlotNotificationKey(slot: ScheduleSlot): string {
  return `${slot.dateKey}T${slot.startTime}`;
}

export function getDueSlotNotificationItems(
  todos: TodoFlow[],
  tasks: Task[],
  now = new Date(),
  reminderMinutes = 15
): DueSlotNotificationItem[] {
  const dueTodos = todos.flatMap((todo) =>
    (todo.scheduleSlots || [])
      .filter((slot) => isSlotDueForReminder(slot, now, reminderMinutes))
      .filter((slot) => todo.lastNotifiedDate !== getSlotNotificationKey(slot))
      .map((slot) => ({
        type: 'todo' as const,
        id: todo.id,
        title: todo.note || 'TodoFlow',
        item: todo,
        slot,
        notificationKey: getSlotNotificationKey(slot),
      }))
  );

  const dueTasks = tasks.flatMap((task) =>
    (task.scheduleSlots || [])
      .filter((slot) => isSlotDueForReminder(slot, now, reminderMinutes))
      .filter((slot) => task.lastNotifiedDate !== getSlotNotificationKey(slot))
      .map((slot) => ({
        type: 'task' as const,
        id: task.id,
        title: task.title || 'Task',
        item: task,
        slot,
        notificationKey: getSlotNotificationKey(slot),
      }))
  );

  return [...dueTodos, ...dueTasks];
}
