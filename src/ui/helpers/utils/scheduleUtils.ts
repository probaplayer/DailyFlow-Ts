import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { PrefixType } from '~/enums/Prefix.Type.enum';

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

export type ManageItemFilter = 'all' | 'todos' | 'tasks' | 'scheduled' | 'unscheduled' | 'in-progress' | 'completed';

export interface TodoFlowAnalytics {
  totalTodoFlows: number;
  scheduledDays: number;
  todayTodoFlows: number;
  completedTasks: number;
  totalTasks: number;
  inProgressTodoFlows: number;
  plannedSeconds: number;
  actualSeconds: number;
}

function formatSecondsForPrompt(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function buildTodoFlowContext(todos: TodoFlow[], tasks: Task[], todayKey: string): string {
  const stats = getTodoFlowAnalytics(todos, tasks, todayKey);
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const todoLines = todos.slice(0, 12).map((todo) => {
    const dateText = formatDateKeyList(getTodoScheduleDateKeys(todo), 'unscheduled');
    return `- TodoFlow: ${todo.note || 'Untitled'} | dates: ${dateText} | tasks: ${todo.taskCompleted}/${todo.taskTotal} | planned: ${formatSecondsForPrompt(todo.estimatedTimeTodo || 0)} | actual: ${formatSecondsForPrompt(todo.actualTimeTodo || 0)}`;
  });
  const taskLines = tasks.slice(0, 12).map((task) => {
    const dateText = formatDateKeyList(getTaskScheduleDateKeys(task), 'unscheduled');
    return `- Task: ${task.title || 'Untitled'} | date: ${dateText} | status: ${task.status} | planned: ${formatSecondsForPrompt(task.estimatedTime || 0)} | actual: ${formatSecondsForPrompt(task.actualTime || 0)}`;
  });

  return [
    `Today: ${todayKey}`,
    `Total TodoFlows: ${stats.totalTodoFlows}`,
    `Scheduled days: ${stats.scheduledDays}`,
    `Today TodoFlows: ${stats.todayTodoFlows}`,
    `Completed tasks: ${stats.completedTasks}/${stats.totalTasks}`,
    `Completion rate: ${completionRate}%`,
    `In-progress TodoFlows: ${stats.inProgressTodoFlows}`,
    `Planned time: ${formatSecondsForPrompt(stats.plannedSeconds)}`,
    `Actual time: ${formatSecondsForPrompt(stats.actualSeconds)}`,
    '',
    'TodoFlows:',
    todoLines.length > 0 ? todoLines.join('\n') : '- None',
    '',
    'Standalone tasks:',
    taskLines.length > 0 ? taskLines.join('\n') : '- None',
  ].join('\n');
}

export function createAiTodoFlowAnalysisPrompt(
  todos: TodoFlow[],
  tasks: Task[],
  userRequest: string,
  todayKey = toDateKey(new Date())
): string {
  return [
    'You are an AI productivity analyst for a TodoFlow app.',
    'Analyze the user data below and answer with practical scheduling, workload, and focus-time insights.',
    'Be specific. Mention risks, overloaded days, unfinished work, and next actions.',
    '',
    `User request: ${userRequest.trim() || 'Analyze my TodoFlow data.'}`,
    '',
    'TodoFlow data:',
    buildTodoFlowContext(todos, tasks, todayKey),
  ].join('\n');
}

export function createAiTodoFlowPrompt(
  todos: TodoFlow[],
  tasks: Task[],
  userRequest: string,
  todayKey = toDateKey(new Date())
): string {
  return [
    'You are an AI TodoFlow planner.',
    'Return a concise TodoFlow plan that the user can copy into the app.',
    'Include a TodoFlow title, suggested schedule duration, and task list with estimated minutes.',
    'Use the existing data as context to avoid conflicts and unrealistic planning.',
    '',
    `User request: ${userRequest.trim() || 'Create a TodoFlow for my next useful work block.'}`,
    '',
    'Current TodoFlow data:',
    buildTodoFlowContext(todos, tasks, todayKey),
  ].join('\n');
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateKeyList(dateKeys: string[], emptyText = 'No time selected'): string {
  const uniqueDateKeys = uniqueSortedDateKeys(dateKeys);
  if (uniqueDateKeys.length === 0) {
    return emptyText;
  }

  return uniqueDateKeys.join(' | ');
}

export function formatDateChipLabels(dateKeys: string[]): string[] {
  return uniqueSortedDateKeys(dateKeys);
}

export function formatDateChipItems(
  dateKeys: string[],
  todayKey = toDateKey(new Date())
): Array<{ label: string; isToday: boolean }> {
  return formatDateChipLabels(dateKeys).map((label) => ({
    label,
    isToday: label === todayKey,
  }));
}

export function formatScheduleSlotChipLabels(slots: ScheduleSlot[] = []): string[] {
  return [...slots]
    .sort((a, b) => `${a.dateKey}T${a.startTime}`.localeCompare(`${b.dateKey}T${b.startTime}`))
    .map((slot) => `${slot.dateKey} ${slot.startTime}-${slot.endTime}`);
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

export function toggleDateKeySelection(selectedDateKeys: string[], dateKey: string): string[] {
  if (selectedDateKeys.includes(dateKey)) {
    const nextKeys = selectedDateKeys.filter((selectedDateKey) => selectedDateKey !== dateKey);
    return nextKeys.length > 0 ? uniqueSortedDateKeys(nextKeys) : [dateKey];
  }

  return uniqueSortedDateKeys([...selectedDateKeys, dateKey]);
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

function getScheduleSlotsDurationSeconds(slots?: ScheduleSlot[]): number | undefined {
  if (!slots || slots.length === 0) {
    return undefined;
  }

  return slots.reduce((total, slot) => total + secondsBetweenTimeStrings(slot.startTime, slot.endTime), 0);
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

function cloneTodoTasksWithIds(
  todo: TodoFlow,
  createTaskId: (taskId: string) => string
): { taskIds: string[]; tasks: Record<string, Task>; currentTaskId?: string } {
  const idMap = Object.fromEntries(todo.taskIds.map((taskId) => [taskId, createTaskId(taskId)]));
  const taskIds = todo.taskIds.map((taskId) => idMap[taskId]);
  const tasks = todo.taskIds.reduce<Record<string, Task>>((nextTasks, taskId) => {
    const task = todo.tasks[taskId];
    const nextTaskId = idMap[taskId];
    if (task) {
      nextTasks[nextTaskId] = {
        ...task,
        id: nextTaskId,
        subTasks: task.subTasks.map((subTask) => ({ ...subTask })),
      };
    }
    return nextTasks;
  }, {});

  return {
    taskIds,
    tasks,
    currentTaskId: todo.currentTaskId ? idMap[todo.currentTaskId] : undefined,
  };
}

export function splitTodoFlowForDate(
  todo: TodoFlow,
  newTodoId: string,
  dateKey: string,
  createTaskId: (taskId: string) => string = (taskId) => taskId
): { originalTodo: TodoFlow; detachedTodo: TodoFlow } | null {
  const assignedDateKeys = getTodoScheduleDateKeys(todo);
  if (assignedDateKeys.length <= 1 || !assignedDateKeys.includes(dateKey)) {
    return null;
  }

  const remainingDateKeys = assignedDateKeys.filter((assignedDateKey) => assignedDateKey !== dateKey);
  const detachedSlots = (todo.scheduleSlots || []).filter((slot) => slot.dateKey === dateKey);
  const remainingSlots = (todo.scheduleSlots || []).filter((slot) => slot.dateKey !== dateKey);
  const originalDuration = getScheduleSlotsDurationSeconds(remainingSlots);
  const detachedDuration = getScheduleSlotsDurationSeconds(detachedSlots);
  const detachedTasks = cloneTodoTasksWithIds(todo, createTaskId);

  const originalTodo = {
    ...applyTodoScheduleDateKeys(todo, remainingDateKeys),
    scheduleSlots: remainingSlots.length > 0 ? remainingSlots.map((slot) => ({ ...slot })) : undefined,
    estimatedTimeTodo: originalDuration ?? todo.estimatedTimeTodo,
    timer: null,
    lastNotifiedDate: undefined,
  };

  const detachedTodo = {
    ...todo,
    id: newTodoId,
    scheduledDate: dateKey,
    scheduledDates: undefined,
    scheduleSlots: detachedSlots.length > 0 ? detachedSlots.map((slot) => ({ ...slot })) : undefined,
    estimatedTimeTodo: detachedDuration ?? todo.estimatedTimeTodo,
    tasks: detachedTasks.tasks,
    taskIds: detachedTasks.taskIds,
    currentTaskId: detachedTasks.currentTaskId,
    timer: null,
    lastNotifiedDate: undefined,
  };

  return { originalTodo, detachedTodo };
}

function todoMatchesSearch(todo: TodoFlow, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchable = [
    todo.note,
    ...todo.taskIds.map((taskId) => todo.tasks[taskId]?.title || ''),
  ].join(' ').toLowerCase();

  return searchable.includes(query);
}

function taskMatchesSearch(task: Task, query: string): boolean {
  if (!query) {
    return true;
  }

  return `${task.title} ${task.description || ''}`.toLowerCase().includes(query);
}

function isTodoCompleted(todo: TodoFlow): boolean {
  return todo.taskTotal > 0 && todo.taskCompleted >= todo.taskTotal;
}

export function filterManageItems(
  todos: TodoFlow[],
  tasks: Task[],
  searchText: string,
  filter: ManageItemFilter
): ScheduledDayItems {
  const query = searchText.trim().toLowerCase();
  const searchedTodos = todos.filter((todo) => todoMatchesSearch(todo, query));
  const searchedTasks = tasks.filter((task) => taskMatchesSearch(task, query));

  if (filter === 'todos') {
    return { todos: searchedTodos, tasks: [] };
  }
  if (filter === 'tasks') {
    return { todos: [], tasks: searchedTasks };
  }
  if (filter === 'scheduled') {
    return {
      todos: searchedTodos.filter((todo) => getTodoScheduleDateKeys(todo).length > 0),
      tasks: searchedTasks.filter((task) => getTaskScheduleDateKeys(task).length > 0),
    };
  }
  if (filter === 'unscheduled') {
    return {
      todos: searchedTodos.filter((todo) => getTodoScheduleDateKeys(todo).length === 0),
      tasks: searchedTasks.filter((task) => getTaskScheduleDateKeys(task).length === 0),
    };
  }
  if (filter === 'in-progress') {
    return {
      todos: searchedTodos.filter((todo) => hasTodoFlowStarted(todo) && !isTodoCompleted(todo)),
      tasks: searchedTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.PAUSED),
    };
  }
  if (filter === 'completed') {
    return {
      todos: searchedTodos.filter(isTodoCompleted),
      tasks: searchedTasks.filter((task) => task.status === TaskStatus.COMPLETED),
    };
  }

  return { todos: searchedTodos, tasks: searchedTasks };
}

export function getTodoFlowAnalytics(
  todos: TodoFlow[],
  tasks: Task[],
  todayKey = toDateKey(new Date())
): TodoFlowAnalytics {
  const todoStats = todos.reduce(
    (stats, todo) => {
      const dateKeys = getTodoScheduleDateKeys(todo);
      stats.scheduledDays += dateKeys.length;
      stats.todayTodoFlows += dateKeys.includes(todayKey) ? 1 : 0;
      stats.completedTasks += todo.taskCompleted || 0;
      stats.totalTasks += todo.taskTotal || todo.taskIds.filter((taskId) => !todo.tasks[taskId]?.isTaskBreak).length;
      stats.inProgressTodoFlows += hasTodoFlowStarted(todo) && !isTodoCompleted(todo) ? 1 : 0;
      stats.plannedSeconds += todo.estimatedTimeTodo || 0;
      stats.actualSeconds += todo.actualTimeTodo || 0;
      return stats;
    },
    {
      scheduledDays: 0,
      todayTodoFlows: 0,
      completedTasks: 0,
      totalTasks: 0,
      inProgressTodoFlows: 0,
      plannedSeconds: 0,
      actualSeconds: 0,
    }
  );

  const standaloneTaskStats = tasks.reduce(
    (stats, task) => {
      if (!task.isTaskBreak) {
        stats.completedTasks += task.status === TaskStatus.COMPLETED ? 1 : 0;
        stats.totalTasks += 1;
        stats.plannedSeconds += task.estimatedTime || 0;
        stats.actualSeconds += task.actualTime || 0;
      }
      return stats;
    },
    { completedTasks: 0, totalTasks: 0, plannedSeconds: 0, actualSeconds: 0 }
  );

  return {
    totalTodoFlows: todos.length,
    scheduledDays: todoStats.scheduledDays,
    todayTodoFlows: todoStats.todayTodoFlows,
    completedTasks: todoStats.completedTasks + standaloneTaskStats.completedTasks,
    totalTasks: todoStats.totalTasks + standaloneTaskStats.totalTasks,
    inProgressTodoFlows: todoStats.inProgressTodoFlows,
    plannedSeconds: todoStats.plannedSeconds + standaloneTaskStats.plannedSeconds,
    actualSeconds: todoStats.actualSeconds + standaloneTaskStats.actualSeconds,
  };
}

function parseTimeString(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error('Time must use HH:mm format');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes !== 0)) {
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

export function isScheduleSlotSelectable(slot: ScheduleSlot, now = new Date()): boolean {
  secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const todayKey = toDateKey(now);
  if (slot.dateKey < todayKey) {
    return false;
  }
  if (slot.dateKey > todayKey) {
    return true;
  }

  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60;
  return parseTimeString(slot.startTime) >= nowSeconds;
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
  if (totalMinutes === 24 * 60) {
    return '24:00';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function secondsFromMidnightToTimeString(totalSeconds: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 * 60, totalSeconds));
  if (clamped === 24 * 60 * 60) {
    return '24:00';
  }
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function moveScheduleSlotPreservingDuration(
  slot: ScheduleSlot,
  dateKey: string,
  startTime: string
): ScheduleSlot {
  const durationSeconds = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const dayEndSeconds = 24 * 60 * 60;
  const startSeconds = Math.max(0, Math.min(parseTimeString(startTime), dayEndSeconds - durationSeconds));
  return {
    dateKey,
    startTime: timeStringFromSeconds(startSeconds),
    endTime: timeStringFromSeconds(startSeconds + durationSeconds),
  };
}

export function findAutoFitScheduleSlot(
  slot: ScheduleSlot,
  existingSlots: ScheduleSlot[],
  options: { minStartTime?: string; durationSeconds?: number } = {}
): ScheduleSlot | null {
  const durationSeconds = options.durationSeconds ?? secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const dayEndSeconds = 24 * 60 * 60;
  const minStartSeconds = options.minStartTime ? parseTimeString(options.minStartTime) : 0;
  const sameDaySlots = existingSlots
    .filter((existing) => existing.dateKey === slot.dateKey)
    .sort((a, b) => parseTimeString(a.startTime) - parseTimeString(b.startTime));

  const buildSlot = (startSeconds: number): ScheduleSlot => ({
    dateKey: slot.dateKey,
    startTime: secondsFromMidnightToTimeString(startSeconds),
    endTime: secondsFromMidnightToTimeString(startSeconds + durationSeconds),
  });

  let candidateStart = Math.max(parseTimeString(slot.startTime), minStartSeconds);
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

  const endOfDayCandidate = buildSlot(dayEndSeconds - durationSeconds);
  if (
    dayEndSeconds >= durationSeconds &&
    dayEndSeconds - durationSeconds >= minStartSeconds &&
    !hasOverlappingScheduleSlot(endOfDayCandidate, sameDaySlots)
  ) {
    return endOfDayCandidate;
  }

  for (let index = sameDaySlots.length - 1; index >= 0; index -= 1) {
    const gapEnd = parseTimeString(sameDaySlots[index].startTime);
    const gapStart = Math.max(index === 0 ? 0 : parseTimeString(sameDaySlots[index - 1].endTime), minStartSeconds);
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

export function hasTodoFlowStarted(todo: TodoFlow): boolean {
  const hasTaskProgress = todo.taskIds.some((taskId) => {
    const task = todo.tasks[taskId];
    return Boolean(
      task &&
        (task.status === TaskStatus.PAUSED ||
          task.status === TaskStatus.IN_PROGRESS ||
          task.status === TaskStatus.COMPLETED ||
          (task.actualTime || 0) > 0)
    );
  });

  const hasTodoProgress =
    Boolean(todo.currentTaskId) ||
    (todo.actualTimeTodo || 0) > 0 ||
    (todo.taskCompleted || 0) > 0 ||
    todo.status !== TodoStatus.STOP;

  return hasTodoProgress || hasTaskProgress;
}

export function getTodoFlowLaunchLabel(todo: TodoFlow): 'Start' | 'Resume' {
  return hasTodoFlowStarted(todo) ? 'Resume' : 'Start';
}

export function resetTodoFlowProgress(todo: TodoFlow): TodoFlow {
  const taskIds = todo.taskIds.filter((id) => !id.includes(PrefixType.BREAK_PREFIX));
  const tasks = taskIds.reduce<Record<string, Task>>((nextTasks, id) => {
    const task = todo.tasks[id];
    if (task) {
      nextTasks[id] = { ...task, status: TaskStatus.NOT_STARTED, actualTime: 0 };
    }
    return nextTasks;
  }, {});

  return {
    ...todo,
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: taskIds.length,
    actualTimeTodo: 0,
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
    taskIds,
    tasks,
  };
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
  const scheduleSlots = applyScheduleSlot(todo.scheduleSlots, slot);
  const dateKeys = getScheduleSlotDateKeys(scheduleSlots);
  const totalDuration = scheduleSlots.reduce(
    (total, item) => total + secondsBetweenTimeStrings(item.startTime, item.endTime),
    0
  );

  return {
    ...todo,
    scheduleSlots,
    scheduledDate: dateKeys[0],
    scheduledDates: dateKeys.length > 1 ? dateKeys : undefined,
    estimatedTimeTodo: totalDuration,
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

export function syncTodoTaskEstimatesWithDuration(todo: TodoFlow, totalEstimatedSeconds: number): TodoFlow {
  const taskIds = todo.taskIds.filter((id) => {
    const task = todo.tasks[id];
    return task && !task.isTaskBreak;
  });

  if (taskIds.length === 0) {
    return {
      ...todo,
      estimatedTimeTodo: Math.max(0, Math.floor(totalEstimatedSeconds)),
      taskTotal: 0,
    };
  }

  const syncedTasks = createDefaultTasksForSchedule(totalEstimatedSeconds, taskIds);
  const syncedTaskById = Object.fromEntries(syncedTasks.map((task) => [task.id, task.estimatedTime]));
  const tasks = Object.fromEntries(
    Object.entries(todo.tasks).map(([id, task]) => [
      id,
      syncedTaskById[id] === undefined ? task : { ...task, estimatedTime: syncedTaskById[id] },
    ])
  ) as Record<string, Task>;

  return {
    ...todo,
    tasks,
    taskTotal: taskIds.length,
    estimatedTimeTodo: Math.max(0, Math.floor(totalEstimatedSeconds)),
  };
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
