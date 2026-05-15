import { useEffect, useMemo, useState } from 'react';
import { PageType } from '~/enums/PageType.enum';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import {
  getTodoFlowAnalytics,
  getTodoScheduleDateKeys,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';
import { formatTime } from '~/ui/helpers/utils/utils';
import './Analytics.css';

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const Analytics = () => {
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  useResizePage(PageType.MAIN);

  const fetchItems = async () => {
    const [allTodos, allTasks]: [TodoFlow[], Task[]] = await Promise.all([
      window.electronAPI.todoGetAll(),
      window.electronAPI.taskGetAll(),
    ]);
    setTodos(allTodos.map(withoutRuntimeTimer));
    setTasks(allTasks);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const stats = useMemo(() => getTodoFlowAnalytics(todos, tasks), [todos, tasks]);
  const todayKey = toDateKey(new Date());
  const upcomingTodos = useMemo(
    () =>
      todos
        .filter((todo) => getTodoScheduleDateKeys(todo).some((dateKey) => dateKey >= todayKey))
        .slice(0, 6),
    [todos, todayKey]
  );
  const activeTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.PAUSED)
        .slice(0, 6),
    [tasks]
  );
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1 className="text-2xl font-bold text-highlight">Analytics</h1>
        <button className="btn btn-secondary dashboard-month-button" onClick={fetchItems}>
          Refresh
        </button>
      </div>

      <section className="analytics-metrics">
        <div className="analytics-metric card">
          <span>TodoFlows</span>
          <strong>{stats.totalTodoFlows}</strong>
        </div>
        <div className="analytics-metric card">
          <span>Scheduled days</span>
          <strong>{stats.scheduledDays}</strong>
        </div>
        <div className="analytics-metric card">
          <span>Today</span>
          <strong>{stats.todayTodoFlows}</strong>
        </div>
        <div className="analytics-metric card">
          <span>Completion</span>
          <strong>{completionRate}%</strong>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="analytics-panel card">
          <h2>Time</h2>
          <div className="analytics-time-row">
            <span>Planned</span>
            <strong>{formatTime(stats.plannedSeconds)}</strong>
          </div>
          <div className="analytics-time-row">
            <span>Actual</span>
            <strong>{formatTime(stats.actualSeconds)}</strong>
          </div>
          <div className="analytics-progress">
            <div style={{ width: `${Math.min(100, completionRate)}%` }} />
          </div>
          <p className="analytics-muted">
            {stats.completedTasks}/{stats.totalTasks} tasks completed
          </p>
        </div>

        <div className="analytics-panel card">
          <h2>Upcoming TodoFlows</h2>
          {upcomingTodos.length === 0 ? (
            <p className="analytics-muted">No upcoming TodoFlows.</p>
          ) : (
            <div className="analytics-list">
              {upcomingTodos.map((todo) => (
                <div key={todo.id} className="analytics-list-item">
                  <strong>{todo.note || 'TodoFlow'}</strong>
                  <span>{getTodoScheduleDateKeys(todo).join(', ') || 'Unscheduled'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="analytics-panel card">
          <h2>Active Tasks</h2>
          {activeTasks.length === 0 ? (
            <p className="analytics-muted">No active standalone tasks.</p>
          ) : (
            <div className="analytics-list">
              {activeTasks.map((task) => (
                <div key={task.id} className="analytics-list-item">
                  <strong>{task.title || 'Task'}</strong>
                  <span>{task.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Analytics;
