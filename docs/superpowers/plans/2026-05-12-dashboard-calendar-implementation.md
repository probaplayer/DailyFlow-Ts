# Dashboard Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calendar-first Dashboard that schedules both TodoFlows and standalone tasks, sends same-day notifications, and opens standalone tasks as new TodoFlows.

**Architecture:** Add scheduling fields directly to `Task` and `TodoFlow`, then centralize date/grouping/notification logic in a small tested helper module. Dashboard becomes the UI orchestrator: it loads persisted TodoFlows and tasks, renders a month calendar, updates `scheduledDate`, triggers notifications, and navigates to TodoFlow for selected items.

**Tech Stack:** Electron, React 18, TypeScript, Redux Toolkit, Vite 7, Vitest.

---

## File Structure

- Modify `package.json`: add `test:unit` script and `vitest` dev dependency.
- Modify `src/ui/helpers/interfaces/Task.d.ts`: add `scheduledDate` and `lastNotifiedDate`.
- Modify `src/ui/helpers/interfaces/TodoFlow.d.ts`: add `scheduledDate` and `lastNotifiedDate`; change `timer` to runtime-only intent in usage.
- Create `src/ui/helpers/utils/scheduleUtils.ts`: pure date, grouping, TodoFlow-from-task, and notification candidate helpers.
- Create `src/ui/helpers/utils/scheduleUtils.test.ts`: unit tests for scheduling helpers.
- Modify `src/ui/store/todo/todoSlice.ts`: guard timer operations and avoid crash when no current task exists.
- Modify `src/ui/components/TaskInfo/TaskInfo.tsx`: move hooks before conditional return.
- Modify `src/ui/Pages/Dashboard/Dashboard.tsx`: replace list-first layout with calendar-first scheduling behavior.
- Modify `src/ui/Pages/Dashboard/Dashboard.css`: calendar layout and day cell styling.
- Modify `AGENTS.md`: mention `npm run test:unit` again after adding a real test suite.

---

### Task 1: Add Tested Scheduling Helpers

**Files:**
- Modify: `package.json`
- Modify: `src/ui/helpers/interfaces/Task.d.ts`
- Modify: `src/ui/helpers/interfaces/TodoFlow.d.ts`
- Create: `src/ui/helpers/utils/scheduleUtils.ts`
- Create: `src/ui/helpers/utils/scheduleUtils.test.ts`

- [ ] **Step 1: Add test tooling**

Run:

```powershell
npm.cmd install --save-dev vitest@latest
```

Then update `package.json` scripts to include:

```json
"test:unit": "vitest run src"
```

- [ ] **Step 2: Add scheduling fields to global interfaces**

In `src/ui/helpers/interfaces/Task.d.ts`, extend `Task`:

```ts
interface Task {
  id: string;
  title: string;
  estimatedTime: number;
  actualTime: number;
  description?: string;
  status: TaskStatus;
  isTaskBreak?: boolean;
  subTasks: SubTask[];
  scheduledDate?: string;
  lastNotifiedDate?: string;
}
```

In `src/ui/helpers/interfaces/TodoFlow.d.ts`, extend `TodoFlow`:

```ts
interface TodoFlow {
  id: string;
  note: string;
  status: TodoStatus;
  taskCompleted: number;
  taskTotal: number;
  estimatedTimeTodo: number;
  actualTimeTodo: number;
  taskIds: string[];
  tasks: { [key: string]: Task };
  currentTaskId?: string;
  timeLeft?: number;
  timer?: NodeJS.Timeout | null;
  scheduledDate?: string;
  lastNotifiedDate?: string;
}
```

- [ ] **Step 3: Write failing helper tests**

Create `src/ui/helpers/utils/scheduleUtils.test.ts`:

```ts
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
```

- [ ] **Step 4: Run tests and verify they fail because module is missing**

Run:

```powershell
npm.cmd run test:unit -- scheduleUtils
```

Expected: fail with an import/module error for `scheduleUtils`.

- [ ] **Step 5: Implement scheduling helpers**

Create `src/ui/helpers/utils/scheduleUtils.ts`:

```ts
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
    days.push({
      date,
      dateKey: toDateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: toDateKey(date) === todayKey,
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
```

- [ ] **Step 6: Run tests and verify they pass**

Run:

```powershell
npm.cmd run test:unit -- scheduleUtils
```

Expected: all `scheduleUtils` tests pass.

- [ ] **Step 7: Commit helper work**

Run:

```powershell
git add package.json package-lock.json src/ui/helpers/interfaces/Task.d.ts src/ui/helpers/interfaces/TodoFlow.d.ts src/ui/helpers/utils/scheduleUtils.ts src/ui/helpers/utils/scheduleUtils.test.ts
git commit -m "feat: add scheduling helpers"
```

---

### Task 2: Fix Existing Logic Hazards

**Files:**
- Modify: `src/ui/store/todo/todoSlice.ts`
- Modify: `src/ui/components/TaskInfo/TaskInfo.tsx`

- [ ] **Step 1: Write regression tests for timer guards**

Extend `src/ui/helpers/utils/scheduleUtils.test.ts` with a helper-focused test for `createTodoFlowFromTask` already covering runtime reset. No Redux slice test is added because current slice depends on DOM side effects. Verification for the guard is done by `npm.cmd run build`.

- [ ] **Step 2: Guard `setStartTimer`**

In `src/ui/store/todo/todoSlice.ts`, replace `setStartTimer` with:

```ts
setStartTimer: (state, action: PayloadAction<NodeJS.Timeout | null>) => {
  if (state.timer) {
    clearInterval(state.timer);
  }
  const taskId = state.currentTaskId;
  if (!taskId || !state.tasks[taskId]) {
    state.timer = null;
    return;
  }
  state.tasks[taskId].status = TaskStatus.IN_PROGRESS;
  state.timer = action.payload;
  todoflowSlice.caseReducers.calculateEstimatedTime(state);
},
```

- [ ] **Step 3: Avoid persisting runtime timer from Dashboard-created TodoFlow path**

When saving or updating TodoFlows in later Dashboard code, use a local sanitizer:

```ts
const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });
```

Keep this sanitizer close to Dashboard save operations so it is visible at the persistence boundary.

- [ ] **Step 4: Fix `TaskInfo` hook order**

In `src/ui/components/TaskInfo/TaskInfo.tsx`, move `const dispatch = useAppDispatch();` before the null guard:

```tsx
const TaskInfo = ({ task, className }: TaskInfoProps) => {
  const dispatch = useAppDispatch();

  if (!task) return null;

  const { title, estimatedTime } = task;
```

- [ ] **Step 5: Verify build**

Run:

```powershell
npm.cmd run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 6: Commit logic fixes**

Run:

```powershell
git add src/ui/store/todo/todoSlice.ts src/ui/components/TaskInfo/TaskInfo.tsx
git commit -m "fix: harden task timer logic"
```

---

### Task 3: Build Calendar-First Dashboard UI

**Files:**
- Modify: `src/ui/Pages/Dashboard/Dashboard.tsx`
- Modify: `src/ui/Pages/Dashboard/Dashboard.css`

- [ ] **Step 1: Write Dashboard data-flow outline before editing**

Use these local state fields in `Dashboard.tsx`:

```ts
const [todos, setTodos] = useState<TodoFlow[]>([]);
const [standaloneTasks, setStandaloneTasks] = useState<Task[]>([]);
const [visibleMonth, setVisibleMonth] = useState(() => new Date());
const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
const [todoKeySearch, setTodoKeySearch] = useState('');
const [taskKeySearch, setTaskKeySearch] = useState('');
```

- [ ] **Step 2: Replace Dashboard imports**

Use these imports in `Dashboard.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { generateId, getOnMiddleInScreen } from '~/ui/helpers/utils/utils';
import TodoInfo from '~/ui/components/TodoInfo/TodoInfo';
import TaskInfo from '~/ui/components/TaskInfo/TaskInfo';
import { useAppDispatch } from '~/ui/store/hooks';
import { initializeTodoFlow, setTodo } from '~/ui/store/todo/todoSlice';
import { useNavigate } from 'react-router-dom';
import {
  buildMonthDays,
  createTodoFlowFromTask,
  getDueNotificationItems,
  groupScheduledItemsByDate,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';
```

- [ ] **Step 3: Load persisted todos and tasks**

Add:

```ts
const fetchScheduleData = async () => {
  try {
    const [allTodos, allTasks] = await Promise.all([
      window.electronAPI.todoGetAll(),
      window.electronAPI.taskGetAll(),
    ]);
    setTodos(allTodos);
    setStandaloneTasks(allTasks);
  } catch (err) {
    console.error('Failed to fetch schedule data:', err);
  }
};

useEffect(() => {
  fetchScheduleData();
}, []);
```

- [ ] **Step 4: Add computed calendar data**

Add:

```ts
const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
const groupedItems = useMemo(
  () => groupScheduledItemsByDate(todos, standaloneTasks),
  [todos, standaloneTasks]
);
const selectedItems = groupedItems[selectedDateKey] || { todos: [], tasks: [] };

const filteredUnscheduledTodos = groupedItems.unscheduled.todos.filter((todo) =>
  todo.note.toLowerCase().includes(todoKeySearch.toLowerCase())
);
const filteredUnscheduledTasks = groupedItems.unscheduled.tasks.filter((task) =>
  task.title.toLowerCase().includes(taskKeySearch.toLowerCase())
);
```

- [ ] **Step 5: Add schedule update handlers**

Add:

```ts
const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const scheduleTodo = async (todo: TodoFlow, scheduledDate?: string) => {
  const updated = withoutRuntimeTimer({ ...todo, scheduledDate, lastNotifiedDate: undefined });
  await window.electronAPI.todoUpdate(todo.id, updated);
  setTodos((prev) => prev.map((item) => (item.id === todo.id ? updated : item)));
};

const scheduleTask = async (task: Task, scheduledDate?: string) => {
  const updated = { ...task, scheduledDate, lastNotifiedDate: undefined };
  await window.electronAPI.taskUpdate(task.id, updated);
  setStandaloneTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
};
```

- [ ] **Step 6: Add open handlers**

Add:

```ts
const openTodo = (todo: TodoFlow) => {
  dispatch(setTodo(withoutRuntimeTimer(todo)));
  navigate('/todoflow');
};

const openStandaloneTask = (task: Task) => {
  const todo = createTodoFlowFromTask(task, generateId(), generateId());
  dispatch(initializeTodoFlow({ id: todo.id }));
  dispatch(setTodo(todo));
  navigate('/todoflow');
};
```

- [ ] **Step 7: Add due notification effect**

Add:

```ts
useEffect(() => {
  const notifyDueItems = async () => {
    const todayKey = toDateKey(new Date());
    const dueItems = getDueNotificationItems(todos, standaloneTasks, todayKey);

    for (const due of dueItems) {
      const title = due.type === 'todo' ? 'TodoFlow scheduled today' : 'Task scheduled today';
      await window.electronAPI.systemNotification({
        title,
        body: due.title,
      });

      if (due.type === 'todo') {
        await scheduleTodo(due.item, due.item.scheduledDate);
        setTodos((prev) =>
          prev.map((todo) => (todo.id === due.id ? { ...todo, lastNotifiedDate: todayKey } : todo))
        );
        await window.electronAPI.todoUpdate(due.id, { ...due.item, lastNotifiedDate: todayKey, timer: null });
      } else {
        setStandaloneTasks((prev) =>
          prev.map((task) => (task.id === due.id ? { ...task, lastNotifiedDate: todayKey } : task))
        );
        await window.electronAPI.taskUpdate(due.id, { ...due.item, lastNotifiedDate: todayKey });
      }
    }
  };

  if (todos.length || standaloneTasks.length) {
    notifyDueItems();
  }
}, [todos.length, standaloneTasks.length]);
```

If this duplicates updates during review, refactor it into a helper inside Dashboard before committing.

- [ ] **Step 8: Replace Dashboard JSX with calendar-first layout**

Render:

```tsx
return (
  <div className="h-full dashboard dashboard-calendar-page flex flex-col w-full max-w-full">
    <div className="dashboard-calendar-header">
      <h1 className="text-2xl font-bold text-highlight">Dashboard</h1>
      <div className="dashboard-month-controls">
        <button className="btn btn-secondary" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>Prev</button>
        <strong>{visibleMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
        <button className="btn btn-secondary" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>Next</button>
      </div>
    </div>

    <div className="dashboard-calendar-layout">
      <section className="dashboard-calendar-main">
        <div className="dashboard-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="dashboard-month-grid">
          {monthDays.map((day) => {
            const dayItems = groupedItems[day.dateKey] || { todos: [], tasks: [] };
            return (
              <button
                key={day.dateKey}
                className={`dashboard-day ${day.isCurrentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${selectedDateKey === day.dateKey ? 'selected' : ''}`}
                onClick={() => setSelectedDateKey(day.dateKey)}
              >
                <span className="dashboard-day-number">{day.dayOfMonth}</span>
                <span className="dashboard-day-badges">
                  {dayItems.todos.length > 0 && <span>{dayItems.todos.length} todo</span>}
                  {dayItems.tasks.length > 0 && <span>{dayItems.tasks.length} task</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="dashboard-day-panel">
        <h2>{selectedDateKey}</h2>
        <h3>TodoFlows</h3>
        {selectedItems.todos.map((todo) => (
          <TodoInfo key={todo.id} todo={todo} onMakeTodo={openTodo} setTrigger={() => fetchScheduleData()} className="w-full action" />
        ))}
        <h3>Tasks</h3>
        {selectedItems.tasks.map((task) => (
          <div key={task.id} className="dashboard-scheduled-task">
            <TaskInfo task={task} className="w-full action" />
            <button className="btn btn-primary btn-sm w-full mt-2" onClick={() => openStandaloneTask(task)}>Start as TodoFlow</button>
          </div>
        ))}
      </aside>
    </div>

    <section className="dashboard-unscheduled">
      <div>
        <input className="input input-primary" placeholder="Search unscheduled TodoFlow" value={todoKeySearch} onChange={(event) => setTodoKeySearch(event.target.value)} />
        {filteredUnscheduledTodos.map((todo) => (
          <div key={todo.id} className="dashboard-unscheduled-item">
            <TodoInfo todo={todo} onMakeTodo={openTodo} setTrigger={() => fetchScheduleData()} className="w-full action" />
            <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => scheduleTodo(todo, selectedDateKey)}>Schedule on selected day</button>
          </div>
        ))}
      </div>
      <div>
        <input className="input input-primary" placeholder="Search unscheduled task" value={taskKeySearch} onChange={(event) => setTaskKeySearch(event.target.value)} />
        {filteredUnscheduledTasks.map((task) => (
          <div key={task.id} className="dashboard-unscheduled-item">
            <TaskInfo task={task} className="w-full action" />
            <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => scheduleTask(task, selectedDateKey)}>Schedule on selected day</button>
          </div>
        ))}
      </div>
    </section>
  </div>
);
```

- [ ] **Step 9: Add Dashboard CSS**

Add to `src/ui/Pages/Dashboard/Dashboard.css`:

```css
.dashboard-calendar-page {
  gap: 12px;
}

.dashboard-calendar-header,
.dashboard-month-controls,
.dashboard-day-panel h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dashboard-calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 0.9fr);
  gap: 14px;
  min-height: 0;
}

.dashboard-calendar-main,
.dashboard-day-panel,
.dashboard-unscheduled {
  min-height: 0;
}

.dashboard-weekdays,
.dashboard-month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.dashboard-weekdays {
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
}

.dashboard-day {
  min-height: 78px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 6px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dashboard-day.muted {
  opacity: 0.45;
}

.dashboard-day.today {
  border-color: var(--primary-color);
}

.dashboard-day.selected {
  outline: 2px solid var(--primary-color);
}

.dashboard-day-number {
  font-weight: 700;
}

.dashboard-day-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.72rem;
}

.dashboard-day-badges span {
  border-radius: 999px;
  background: var(--bg-tertiary);
  padding: 2px 6px;
}

.dashboard-day-panel {
  overflow-y: auto;
  max-height: calc(100vh - 145px);
}

.dashboard-day-panel h3 {
  margin-top: 12px;
  margin-bottom: 6px;
  font-weight: 700;
}

.dashboard-scheduled-task,
.dashboard-unscheduled-item {
  margin-top: 8px;
}

.dashboard-unscheduled {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  overflow-y: auto;
  max-height: 220px;
}
```

- [ ] **Step 10: Run build**

Run:

```powershell
npm.cmd run build
```

Expected: build passes. If CSS variable names are missing, use existing global variables from `src/ui/index.css`.

- [ ] **Step 11: Commit Dashboard UI**

Run:

```powershell
git add src/ui/Pages/Dashboard/Dashboard.tsx src/ui/Pages/Dashboard/Dashboard.css
git commit -m "feat: add dashboard calendar scheduling"
```

---

### Task 4: Final Verification and Docs

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update contributor guide testing command**

In `AGENTS.md`, add this command under Build/Test:

```md
- `npm run test:unit`: run Vitest unit tests under `src`.
```

Update Testing Guidelines:

```md
Use Vitest for focused unit tests near source code under `src`. Name tests after the behavior being verified, for example `scheduleUtils.test.ts`.
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm.cmd run test:unit
npm.cmd run build
npm.cmd audit
```

Expected:

- Unit tests pass.
- Build passes.
- Audit reports `found 0 vulnerabilities`.

- [ ] **Step 3: Optional dev smoke test**

Run:

```powershell
npm.cmd run dev
```

Expected:

- Vite starts on `http://localhost:5123`.
- Electron opens without the previous missing-binary error.
- Dashboard renders the calendar.

Stop the dev process after verifying.

- [ ] **Step 4: Commit final docs/verification changes**

Run:

```powershell
git add AGENTS.md package.json package-lock.json
git commit -m "docs: document unit test command"
```

---

## Self-Review

- Spec coverage: data model fields, calendar-first Dashboard, task-to-TodoFlow behavior, same-day notifications, and scoped logic fixes all map to tasks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified “handle later” items remain.
- Type consistency: scheduling fields are `scheduledDate` and `lastNotifiedDate` everywhere; date keys use `YYYY-MM-DD`; standalone task conversion uses `createTodoFlowFromTask`.
