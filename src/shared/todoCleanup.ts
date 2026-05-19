const MONTHS_TO_KEEP_ASSIGNED_TODOS = 1;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAssignedTodoCutoffDateKey(now = new Date()): string {
  const targetMonth = now.getMonth() - MONTHS_TO_KEEP_ASSIGNED_TODOS;
  const lastDayOfTargetMonth = new Date(now.getFullYear(), targetMonth + 1, 0).getDate();
  const cutoffDay = Math.min(now.getDate(), lastDayOfTargetMonth);
  return toDateKey(new Date(now.getFullYear(), targetMonth, cutoffDay));
}

export function getTodoAssignedDateKeys(todo: any): string[] {
  const keys = new Set<string>();

  if (typeof todo?.scheduledDate === 'string' && todo.scheduledDate) {
    keys.add(todo.scheduledDate);
  }

  if (Array.isArray(todo?.scheduledDates)) {
    todo.scheduledDates.forEach((dateKey: unknown) => {
      if (typeof dateKey === 'string' && dateKey) {
        keys.add(dateKey);
      }
    });
  }

  if (Array.isArray(todo?.scheduleSlots)) {
    todo.scheduleSlots.forEach((slot: any) => {
      if (typeof slot?.dateKey === 'string' && slot.dateKey) {
        keys.add(slot.dateKey);
      }
    });
  }

  return Array.from(keys).sort();
}

export function isAssignedTodoOlderThanCutoff(todo: any, cutoffDateKey: string): boolean {
  const assignedDateKeys = getTodoAssignedDateKeys(todo);
  return assignedDateKeys.length > 0 && assignedDateKeys.every((dateKey) => dateKey < cutoffDateKey);
}

export function splitExpiredAssignedTodos<T>(todos: T[], now = new Date()): { activeTodos: T[]; expiredTodos: T[] } {
  const cutoffDateKey = getAssignedTodoCutoffDateKey(now);
  const activeTodos: T[] = [];
  const expiredTodos: T[] = [];

  todos.forEach((todo) => {
    if (isAssignedTodoOlderThanCutoff(todo, cutoffDateKey)) {
      expiredTodos.push(todo);
      return;
    }
    activeTodos.push(todo);
  });

  return { activeTodos, expiredTodos };
}
