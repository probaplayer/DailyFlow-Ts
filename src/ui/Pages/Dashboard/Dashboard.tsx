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

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [standaloneTasks, setStandaloneTasks] = useState<Task[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [todoKeySearch, setTodoKeySearch] = useState('');
  const [taskKeySearch, setTaskKeySearch] = useState('');

  const fetchScheduleData = async () => {
    try {
      const [allTodos, allTasks]: [TodoFlow[], Task[]] = await Promise.all([
        window.electronAPI.todoGetAll(),
        window.electronAPI.taskGetAll(),
      ]);
      setTodos(allTodos.map(withoutRuntimeTimer));
      setStandaloneTasks(allTasks);
    } catch (err) {
      console.error('Failed to fetch schedule data:', err);
    }
  };

  useEffect(() => {
    const handleToResize = async () => {
      const { width, height } = getPageSize(PageType.MAIN);
      const { width: currentWidth, height: currentHeight } = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove(
        'main',
        width,
        height,
        60,
        getOnMiddleInScreen(currentWidth, currentHeight, width, height)
      );
    };

    handleToResize();
    fetchScheduleData();
  }, []);

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

  useEffect(() => {
    const notifyDueItems = async () => {
      const todayKey = toDateKey(new Date());
      const dueItems = getDueNotificationItems(todos, standaloneTasks, todayKey);

      for (const due of dueItems) {
        await window.electronAPI.systemNotification({
          title: due.type === 'todo' ? 'TodoFlow scheduled today' : 'Task scheduled today',
          body: due.title,
        });

        if (due.type === 'todo') {
          const updated = withoutRuntimeTimer({ ...due.item, lastNotifiedDate: todayKey });
          await window.electronAPI.todoUpdate(due.id, updated);
          setTodos((prev) => prev.map((todo) => (todo.id === due.id ? updated : todo)));
        } else {
          const updated = { ...due.item, lastNotifiedDate: todayKey };
          await window.electronAPI.taskUpdate(due.id, updated);
          setStandaloneTasks((prev) => prev.map((task) => (task.id === due.id ? updated : task)));
        }
      }
    };

    if (todos.length || standaloneTasks.length) {
      notifyDueItems();
    }
  }, [todos.length, standaloneTasks.length]);

  const moveVisibleMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
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

      <div className="dashboard-calendar-layout">
        <section className="dashboard-calendar-main">
          <div className="dashboard-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="dashboard-month-grid">
            {monthDays.map((day) => {
              const dayItems = groupedItems[day.dateKey] || { todos: [], tasks: [] };
              return (
                <button
                  key={day.dateKey}
                  className={`dashboard-day ${day.isCurrentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${
                    selectedDateKey === day.dateKey ? 'selected' : ''
                  }`}
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

        <aside className="dashboard-day-panel card">
          <div className="dashboard-panel-header">
            <h2>{selectedDateKey}</h2>
          </div>

          <h3>TodoFlows</h3>
          {selectedItems.todos.length === 0 ? (
            <p className="dashboard-empty">No TodoFlows scheduled.</p>
          ) : (
            selectedItems.todos.map((todo) => (
              <div key={todo.id} className="dashboard-scheduled-item">
                <TodoInfo todo={todo} onMakeTodo={openTodo} setTrigger={fetchScheduleData} className="w-full action" />
                <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => scheduleTodo(todo, undefined)}>
                  Unschedule
                </button>
              </div>
            ))
          )}

          <h3>Tasks</h3>
          {selectedItems.tasks.length === 0 ? (
            <p className="dashboard-empty">No tasks scheduled.</p>
          ) : (
            selectedItems.tasks.map((task) => (
              <div key={task.id} className="dashboard-scheduled-item">
                <TaskInfo task={task} className="w-full action" />
                <button className="btn btn-primary btn-sm w-full mt-2" onClick={() => openStandaloneTask(task)}>
                  Start as TodoFlow
                </button>
                <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => scheduleTask(task, undefined)}>
                  Unschedule
                </button>
              </div>
            ))
          )}
        </aside>
      </div>

      <section className="dashboard-unscheduled">
        <div className="dashboard-unscheduled-column">
          <input
            className="input input-primary"
            placeholder="Search unscheduled TodoFlow"
            value={todoKeySearch}
            onChange={(event) => setTodoKeySearch(event.target.value)}
          />
          <div className="dashboard-unscheduled-list">
            {filteredUnscheduledTodos.map((todo) => (
              <div key={todo.id} className="dashboard-unscheduled-item">
                <TodoInfo todo={todo} onMakeTodo={openTodo} setTrigger={fetchScheduleData} className="w-full action" />
                <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => scheduleTodo(todo, selectedDateKey)}>
                  Schedule on selected day
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-unscheduled-column">
          <input
            className="input input-primary"
            placeholder="Search unscheduled task"
            value={taskKeySearch}
            onChange={(event) => setTaskKeySearch(event.target.value)}
          />
          <div className="dashboard-unscheduled-list">
            {filteredUnscheduledTasks.map((task) => (
              <div key={task.id} className="dashboard-unscheduled-item">
                <TaskInfo task={task} className="w-full action" />
                <button className="btn btn-secondary btn-sm w-full mt-2" onClick={() => scheduleTask(task, selectedDateKey)}>
                  Schedule on selected day
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
