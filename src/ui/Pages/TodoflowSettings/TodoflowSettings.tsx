import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoArrowBackOutline, IoCalendarOutline, IoGitBranchOutline, IoSaveOutline } from 'react-icons/io5';
import { PageType } from '~/enums/PageType.enum';
import DateChipList from '~/ui/components/DateChipList/DateChipList';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import { formatTime, generateId, parseTime } from '~/ui/helpers/utils/utils';
import { useAppDispatch, useAppSelector } from '~/ui/store/hooks';
import { setTodo } from '~/ui/store/todo/todoSlice';
import {
  formatDateChipLabels,
  formatScheduleSlotChipLabels,
  getTodoScheduleDateKeys,
  getTodoTaskEstimatedSeconds,
  resizeTodoFlowScheduleDuration,
  splitTodoFlowForDate,
  syncTodoTaskEstimatesWithDuration,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';
import './TodoflowSettings.css';

const formatDurationInput = (value: string): string => {
  const numbersOnly = value.replace(/\D/g, '');
  if (numbersOnly === '') return '';
  const limitedNumbers = numbersOnly.slice(0, 6);
  if (limitedNumbers.length <= 2) return limitedNumbers;
  if (limitedNumbers.length <= 4) return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2)}`;
  return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2, 4)}:${limitedNumbers.slice(4)}`;
};

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const TodoflowSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const todoFlow = useAppSelector((state) => state.todoflow);
  const { info } = useAlert();
  const routeState = location.state as { activeDateKey?: string } | null;
  const [actualTimeInputValue, setActualTimeInputValue] = useState('');
  const [estimatedTimeInputValue, setEstimatedTimeInputValue] = useState('');
  const [timeError, setTimeError] = useState('');

  useResizePage(PageType.TODOFLOW, 'left');

  useEffect(() => {
    setActualTimeInputValue(formatTime(todoFlow.actualTimeTodo || 0));
    setEstimatedTimeInputValue(formatTime(todoFlow.estimatedTimeTodo || 0));
  }, [todoFlow.actualTimeTodo, todoFlow.estimatedTimeTodo]);

  const persistTodoFlow = async (todo: TodoFlow) => {
    const persistableTodo = withoutRuntimeTimer(todo);
    await window.electronAPI.todoUpsert(persistableTodo);
    for (const taskId of persistableTodo.taskIds) {
      const task = persistableTodo.tasks[taskId];
      if (task) {
        await window.electronAPI.taskUpsert(task);
      }
    }
  };

  const saveActualTime = async () => {
    const seconds = Math.max(0, Math.min(86400, parseTime(actualTimeInputValue) || 0));
    const nextTodo = withoutRuntimeTimer({ ...todoFlow, actualTimeTodo: seconds });
    dispatch(setTodo(nextTodo));
    await persistTodoFlow(nextTodo);
    setActualTimeInputValue(formatTime(seconds));
    setTimeError('');
  };

  const saveEstimatedTime = async () => {
    const seconds = Math.max(0, Math.min(86400, parseTime(estimatedTimeInputValue) || 0));
    const taskTotal = getTodoTaskEstimatedSeconds(todoFlow);
    if (seconds < taskTotal) {
      setTimeError('Estimated time cannot be less than the current tasks total');
      setEstimatedTimeInputValue(formatTime(todoFlow.estimatedTimeTodo || 0));
      return;
    }

    const latestTodos = await window.electronAPI.todoGetAll().catch(() => []);
    const resized = resizeTodoFlowScheduleDuration(todoFlow, seconds, latestTodos);
    if (!resized.ok) {
      setTimeError(resized.reason);
      setEstimatedTimeInputValue(formatTime(todoFlow.estimatedTimeTodo || 0));
      return;
    }

    const nextTodo = withoutRuntimeTimer(syncTodoTaskEstimatesWithDuration(resized.todo, seconds));
    dispatch(setTodo(nextTodo));
    await persistTodoFlow(nextTodo);
    setEstimatedTimeInputValue(formatTime(seconds));
    setTimeError('');
  };

  const openScheduleEditor = async () => {
    if (!todoFlow.id) {
      info('Save the TodoFlow before editing schedule.');
      return;
    }
    await window.electronAPI.openScheduleEditorWindow({
      todoId: todoFlow.id,
      dateKeys: getTodoScheduleDateKeys(todoFlow),
      returnTo: '/todoflow-setting',
      activeDateKey,
    });
  };

  const assignedDateKeys = getTodoScheduleDateKeys(todoFlow);
  const todayKey = toDateKey(new Date());
  const activeDateKey =
    routeState?.activeDateKey && assignedDateKeys.includes(routeState.activeDateKey)
      ? routeState.activeDateKey
      : assignedDateKeys.includes(todayKey)
        ? todayKey
        : assignedDateKeys[0];
  const canDetachTodoFlow = assignedDateKeys.length > 1 && Boolean(activeDateKey);
  const slotLabels = formatScheduleSlotChipLabels(todoFlow.scheduleSlots || []);

  const handleDetachTodoFlow = async () => {
    if (!activeDateKey) return;

    const result = splitTodoFlowForDate(todoFlow, generateId(), activeDateKey, () => generateId());
    if (!result) {
      info('This TodoFlow cannot be detached.');
      return;
    }

    try {
      await window.electronAPI.todoUpsert(result.originalTodo);
      await window.electronAPI.todoUpsert(result.detachedTodo);
      for (const taskId of result.detachedTodo.taskIds) {
        const task = result.detachedTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
      dispatch(setTodo(result.detachedTodo));
      info('TodoFlow detached for this day.');
      navigate('/todoflow-setting', { replace: true, state: { activeDateKey } });
    } catch (error) {
      console.error('Failed to detach TodoFlow:', error);
      info('Failed to detach TodoFlow');
    }
  };

  return (
    <div className="todoflow-settings-page">
      <header className="todoflow-settings-header">
        <button className="btn btn-icon" title="Back to TodoFlow" onClick={() => navigate('/todoflow')}>
          <IoArrowBackOutline />
        </button>
        <div className="todoflow-settings-title">
          <h1>TodoFlow Settings</h1>
          <p>{todoFlow.note || 'Untitled TodoFlow'}</p>
        </div>
      </header>

      <section className="todoflow-settings-section">
        <div className="todoflow-settings-section-title">
          <IoCalendarOutline />
          <h2>Assigned Days</h2>
        </div>
        <DateChipList labels={formatDateChipLabels(assignedDateKeys)} emptyText="No assigned days" />
        <DateChipList labels={slotLabels} emptyText="No time slots" className="todoflow-settings-slots" />
        <button className="btn btn-secondary todoflow-settings-action" onClick={openScheduleEditor}>
          Edit Schedule
        </button>
        {canDetachTodoFlow && (
          <button className="btn btn-secondary todoflow-settings-action todoflow-settings-detach" onClick={handleDetachTodoFlow}>
            <IoGitBranchOutline />
            Detach {activeDateKey}
          </button>
        )}
      </section>

      <section className="todoflow-settings-section">
        <h2>Time</h2>
        <div className="todoflow-settings-time-grid">
          <label className="todoflow-settings-field">
            <span>Actual time</span>
            <input
              className="input todoflow-settings-time-input"
              value={actualTimeInputValue}
              onChange={(event) => setActualTimeInputValue(formatDurationInput(event.target.value))}
              onBlur={saveActualTime}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              placeholder="HH:MM:SS"
            />
          </label>
          <label className="todoflow-settings-field">
            <span>Estimated time</span>
            <input
              className={`input todoflow-settings-time-input ${timeError ? 'input-error' : ''}`}
              value={estimatedTimeInputValue}
              onChange={(event) => {
                setEstimatedTimeInputValue(formatDurationInput(event.target.value));
                if (timeError) setTimeError('');
              }}
              onBlur={saveEstimatedTime}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              placeholder="HH:MM:SS"
            />
          </label>
        </div>
        {timeError && <p className="todoflow-settings-error">{timeError}</p>}
      </section>

      <section className="todoflow-settings-section">
        <h2>Summary</h2>
        <div className="todoflow-settings-summary">
          <span>Status</span>
          <strong>{todoFlow.status}</strong>
          <span>Tasks</span>
          <strong>{todoFlow.taskCompleted}/{todoFlow.taskTotal}</strong>
        </div>
      </section>

      <button className="btn btn-primary todoflow-settings-save" onClick={() => navigate('/todoflow')}>
        <IoSaveOutline />
        Done
      </button>
    </div>
  );
};

export default TodoflowSettings;
