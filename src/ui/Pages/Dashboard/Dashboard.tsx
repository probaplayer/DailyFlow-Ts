import { useEffect, useMemo, useRef, useState } from 'react';
import './Dashboard.css';
import { PageType } from '~/enums/PageType.enum';
import { useAppDispatch } from '~/ui/store/hooks';
import { setTodo } from '~/ui/store/todo/todoSlice';
import { useNavigate } from 'react-router-dom';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import {
  buildMonthDays,
  formatDateChipLabels,
  getDueNotificationItems,
  getDueSlotNotificationItems,
  getTodoFlowLaunchLabel,
  groupScheduledItemsByDate,
  groupScheduledItemsForDateRange,
  type DueSlotNotificationItem,
  isPastDateKey,
  listDateKeysBetween,
  secondsBetweenTimeStrings,
  toggleDateKeySelection,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';
import DateChipList from '~/ui/components/DateChipList/DateChipList';

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });
const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_STEP = 18;

const isDueSlotNotification = (item: unknown): item is DueSlotNotificationItem => {
  return Boolean(item && typeof item === 'object' && 'slot' in item && 'notificationKey' in item);
};

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const dayMenuRef = useRef<HTMLDivElement | null>(null);
  const calendarLayoutRef = useRef<HTMLDivElement | null>(null);
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>(() => [toDateKey(new Date())]);
  const [rangeStartDateKey, setRangeStartDateKey] = useState(() => toDateKey(new Date()));
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const [dayMenu, setDayMenu] = useState<{ dateKey: string; top: number; left: number } | null>(null);

  useResizePage(PageType.MAIN);

  const fetchScheduleData = async () => {
    try {
      const allTodos: TodoFlow[] = await window.electronAPI.todoGetAll();
      setTodos(allTodos.map(withoutRuntimeTimer));
    } catch (err) {
      console.error('Failed to fetch schedule data:', err);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const groupedItems = useMemo(
    () => groupScheduledItemsByDate(todos, []),
    [todos]
  );
  const selectedRangeItems = useMemo(
    () => groupScheduledItemsForDateRange(todos, [], selectedDateKeys),
    [todos, selectedDateKeys]
  );

  const openScheduleEditor = async (payload: { todoId?: string; dateKeys?: string[] } = {}) => {
    const targetDateKeys = selectedDateKeys.length > 0 ? selectedDateKeys : [selectedDateKey];
    const selectableDateKeys = targetDateKeys.filter((dateKey) => !isPastDateKey(dateKey));
    if (selectableDateKeys.length === 0) {
      setDayMenu(null);
      return;
    }

    await window.electronAPI.openScheduleEditorWindow({
      dateKeys: payload.dateKeys || selectableDateKeys,
      todoId: payload.todoId,
    });
    await fetchScheduleData();
    setDayMenu(null);
  };

  const openTodo = (todo: TodoFlow, dateKey?: string) => {
    dispatch(setTodo(withoutRuntimeTimer(todo)));
    navigate('/todoflow', { state: { fromDashboard: true, dateKey } });
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (dayMenuRef.current && dayMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setDayMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const stopSelecting = () => setIsSelectingDates(false);
    document.addEventListener('mouseup', stopSelecting);
    return () => document.removeEventListener('mouseup', stopSelecting);
  }, []);

  useEffect(() => {
    if (!isSelectingDates) return;

    const scrollCalendarNearEdge = (event: MouseEvent) => {
      const container = calendarLayoutRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let left = 0;
      let top = 0;
      if (event.clientY > rect.bottom - AUTO_SCROLL_EDGE) top = AUTO_SCROLL_STEP;
      if (event.clientY < rect.top + AUTO_SCROLL_EDGE) top = -AUTO_SCROLL_STEP;
      if (event.clientX > rect.right - AUTO_SCROLL_EDGE) left = AUTO_SCROLL_STEP;
      if (event.clientX < rect.left + AUTO_SCROLL_EDGE) left = -AUTO_SCROLL_STEP;
      if (left || top) {
        container.scrollBy({ left, top });
      }
    };

    document.addEventListener('mousemove', scrollCalendarNearEdge);
    return () => document.removeEventListener('mousemove', scrollCalendarNearEdge);
  }, [isSelectingDates]);

  useEffect(() => {
    const notifyDueItems = async () => {
      const todayKey = toDateKey(new Date());
      const now = new Date();
      const dueSlotItems = getDueSlotNotificationItems(todos, [], now);
      const unslottedTodos = todos.filter((todo) => !todo.scheduleSlots || todo.scheduleSlots.length === 0);
      const dueItems = dueSlotItems.length > 0
        ? dueSlotItems
        : getDueNotificationItems(unslottedTodos, [], todayKey);

      for (const due of dueItems) {
        await window.electronAPI.systemNotification({
          title: 'TodoFlow starts soon',
          body: isDueSlotNotification(due) ? `${due.title} starts at ${due.slot.startTime}` : due.title,
        });

        if (due.type === 'todo') {
          const updated = withoutRuntimeTimer({ ...due.item, lastNotifiedDate: isDueSlotNotification(due) ? due.notificationKey : todayKey });
          await window.electronAPI.todoUpdate(due.id, updated);
          setTodos((prev) => prev.map((todo) => (todo.id === due.id ? updated : todo)));
        } else {
          return;
        }
      }
    };

    if (todos.length) {
      notifyDueItems();
    }
  }, [todos.length]);

  const moveVisibleMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const openDayMenu = (target: HTMLButtonElement, dateKey: string) => {
    const rect = target.getBoundingClientRect();
    const menuWidth = 320;
    setDayMenu({
      dateKey,
      top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 280)),
      left: Math.max(16, Math.min(rect.left, window.innerWidth - menuWidth - 16)),
    });
  };

  const selectSingleDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setSelectedDateKeys([dateKey]);
    setRangeStartDateKey(dateKey);
  };

  const selectDateRange = (dateKey: string) => {
    const nextRange = listDateKeysBetween(rangeStartDateKey, dateKey).filter((key) => !isPastDateKey(key));
    setSelectedDateKey(dateKey);
    setSelectedDateKeys(nextRange);
  };

  const toggleSelectedDate = (dateKey: string) => {
    const nextSelection = toggleDateKeySelection(selectedDateKeys, dateKey);
    setSelectedDateKey(dateKey);
    setSelectedDateKeys(nextSelection.filter((key) => !isPastDateKey(key)));
    setRangeStartDateKey(dateKey);
  };

  const selectedDateCount = selectedDateKeys.length;
  const selectedLabel =
    selectedDateCount > 1
      ? `${selectedDateCount} selected days`
      : selectedDateKeys[0] || selectedDateKey;

  const renderSlotSummary = (slots: ScheduleSlot[]) => {
    if (slots.length === 0) {
      return <p className="dashboard-empty">No time slot selected.</p>;
    }

    return (
      <div className="dashboard-slot-list">
        {slots.map((slot) => {
          const durationMinutes = Math.round(secondsBetweenTimeStrings(slot.startTime, slot.endTime) / 60);
          return (
            <div key={`${slot.dateKey}-${slot.startTime}-${slot.endTime}`} className="dashboard-slot-row">
              <span>{slot.dateKey}</span>
              <strong>{slot.startTime} - {slot.endTime}</strong>
              <em>{durationMinutes} min</em>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full dashboard dashboard-calendar-page flex flex-col w-full max-w-full">
      <div className="dashboard-calendar-header">
        <h1 className="text-2xl font-bold text-highlight">Dashboard</h1>
        <div className="dashboard-month-controls">
          <button className="btn btn-secondary dashboard-month-button" onClick={() => moveVisibleMonth(-1)}>
            Prev
          </button>
          <strong>{visibleMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
          <button className="btn btn-secondary dashboard-month-button" onClick={() => moveVisibleMonth(1)}>
            Next
          </button>
        </div>
      </div>

      <div className="dashboard-calendar-layout" ref={calendarLayoutRef}>
        <aside className="dashboard-day-panel card">
          <div className="dashboard-panel-header">
            <h2>{selectedLabel}</h2>
          </div>

          <h3>TodoFlows</h3>
          {selectedRangeItems.todos.length === 0 ? (
            <p className="dashboard-empty">No TodoFlows scheduled.</p>
          ) : (
            selectedRangeItems.todos.map(({ item: todo, dateKeys, slots }) => (
              <div key={todo.id} className="dashboard-scheduled-item">
                <div className="dashboard-readonly-card">
                  <div className="dashboard-readonly-title">{todo.note || 'TodoFlow'}</div>
                  <DateChipList labels={formatDateChipLabels(dateKeys)} className="dashboard-selection-meta" />
                  {renderSlotSummary(slots)}
                </div>
                <button
                  className="btn btn-primary btn-sm w-full mt-2"
                  onClick={() => openTodo(todo, dateKeys.includes(selectedDateKey) ? selectedDateKey : dateKeys[0])}
                >
                  {getTodoFlowLaunchLabel(todo)}
                </button>
                <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => openScheduleEditor({ todoId: todo.id, dateKeys })}>
                  Open editor
                </button>
              </div>
            ))
          )}

        </aside>

        <section className="dashboard-calendar-main">
          <div className="dashboard-calendar-shell">
          <div className="dashboard-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="dashboard-month-grid">
            {monthDays.map((day) => {
              const dayItems = groupedItems[day.dateKey] || { todos: [], tasks: [] };
              const isPastDay = isPastDateKey(day.dateKey);
              const isSelected = selectedDateKeys.includes(day.dateKey);
              return (
                <button
                  key={day.dateKey}
                  className={`dashboard-day ${day.isCurrentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${
                    isSelected ? 'selected' : ''
                  } ${isPastDay ? 'disabled' : ''}`}
                  disabled={isPastDay}
                  onMouseDown={(event) => {
                    if (isPastDay) return;
                    if (event.ctrlKey || event.metaKey) {
                      toggleSelectedDate(day.dateKey);
                      setIsSelectingDates(false);
                      openDayMenu(event.currentTarget, day.dateKey);
                      return;
                    }

                    if (event.shiftKey) {
                      selectDateRange(day.dateKey);
                      openDayMenu(event.currentTarget, day.dateKey);
                      return;
                    }

                    selectSingleDate(day.dateKey);
                    setIsSelectingDates(true);
                    openDayMenu(event.currentTarget, day.dateKey);
                  }}
                  onMouseEnter={() => {
                    if (isPastDay || !isSelectingDates) return;
                    selectDateRange(day.dateKey);
                  }}
                  onMouseUp={(event) => {
                    if (isPastDay) return;
                    setIsSelectingDates(false);
                    openDayMenu(event.currentTarget, day.dateKey);
                  }}
                  onClick={(event) => {
                    if (isPastDay) return;
                    openDayMenu(event.currentTarget, day.dateKey);
                  }}
                >
                  <span className="dashboard-day-number">{day.dayOfMonth}</span>
                  <span className="dashboard-day-badges">
                    {dayItems.todos.length > 0 && <span>{dayItems.todos.length} todo</span>}
                  </span>
                </button>
              );
            })}
          </div>
          </div>

          {dayMenu && (
            <div
              ref={dayMenuRef}
              className="context-menu dashboard-day-menu"
              style={{ top: dayMenu.top, left: dayMenu.left, position: 'fixed' }}
            >
              <div className="dashboard-day-menu-title">
                Add to {selectedDateCount > 1 ? `${selectedDateCount} days` : dayMenu.dateKey}
              </div>
              <button
                type="button"
                className="context-menu-item dashboard-menu-entry dashboard-create-todo"
                onClick={() => openScheduleEditor()}
              >
                Create {selectedDateCount > 1 ? `${selectedDateCount} TodoFlows` : 'TodoFlow'}
              </button>
              <div className="context-menu-divider" />
              <div className="dashboard-day-menu-section">TodoFlows</div>
              {groupedItems.unscheduled.todos.length === 0 ? (
                <div className="context-menu-item dashboard-menu-empty">No TodoFlows available</div>
              ) : (
                groupedItems.unscheduled.todos.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    className="context-menu-item dashboard-menu-entry"
                    onClick={() => openScheduleEditor({ todoId: todo.id })}
                  >
                    <span className="dashboard-menu-label">{todo.note}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
