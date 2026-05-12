# Dashboard Calendar Design

## Goal

Update the Dashboard to use a calendar-first layout where users can schedule both full TodoFlows and standalone tasks by day. When a scheduled day arrives, the app should show a system notification. If the user opens a standalone scheduled task, the app should create a new TodoFlow containing that task and navigate to the TodoFlow page.

## Current Context

DailyFlow stores TodoFlows in `todo.json` through `todoStore` and standalone tasks in `task.json` through `taskStore`. Dashboard currently shows saved TodoFlows from `todoGetAll()` and task cart items from Redux. System notifications already exist through `window.electronAPI.systemNotification`, exposed by preload and handled in Electron main.

## Data Model

Add optional scheduling fields directly to `Task` and `TodoFlow`:

```ts
scheduledDate?: string; // YYYY-MM-DD
lastNotifiedDate?: string; // YYYY-MM-DD
```

This keeps scheduling attached to the item being scheduled and avoids a separate synchronization layer. Runtime-only fields such as `timer` must not be persisted.

## Dashboard Behavior

Use a calendar-first Dashboard:

- Main area: monthly calendar with day cells.
- Each day shows compact counts or badges for scheduled TodoFlows and tasks.
- Side panel: details for the selected day, split into TodoFlows and standalone tasks.
- Unscheduled section: TodoFlows and tasks without `scheduledDate`.
- Selecting a TodoFlow loads it into Redux with `setTodo(todo)` and navigates to `/todoflow`.
- Selecting a standalone task creates a new TodoFlow with one copied task, a new TodoFlow id, and the selected task reset to `Not Started`, then navigates to `/todoflow`.

## Notification Behavior

On app startup and Dashboard load, check saved TodoFlows and tasks whose `scheduledDate` equals today. Show one system notification per due item unless `lastNotifiedDate` already equals today. After notifying, update the item with `lastNotifiedDate: today` to prevent repeated notifications in the same day.

## Logic Fixes In Scope

- Guard timer operations when no current task exists.
- Stop persisting `timer` values to JSON.
- Fix `TaskInfo` hook order so hooks are always called before conditional returns.
- Load standalone Dashboard tasks from `taskGetAll()` instead of depending on Redux cart state.

## Out Of Scope

- Recurring schedules.
- Drag-and-drop scheduling.
- Background notifications while the app is fully closed.
- Cloud sync or multi-device reminders.
