import { useEffect, useMemo, useState } from 'react';
import { PageType } from '~/enums/PageType.enum';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import {
  getTodoFlowAnalytics,
  getTodoScheduleDateKeys,
} from '~/ui/helpers/utils/scheduleUtils';
import { formatTime } from '~/ui/helpers/utils/utils';
import './AiFlow.css';

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const AiFlow = () => {
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [localResult, setLocalResult] = useState('');
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
  const recentTodos = useMemo(() => todos.slice(0, 5), [todos]);

  const runLocalAnalysis = () => {
    const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    const focus = analysisPrompt.trim() || 'overall TodoFlow health';
    setLocalResult(
      [
        `Focus: ${focus}`,
        `TodoFlows: ${stats.totalTodoFlows}`,
        `Scheduled days: ${stats.scheduledDays}`,
        `Completion: ${completionRate}% (${stats.completedTasks}/${stats.totalTasks})`,
        `Time: ${formatTime(stats.actualSeconds)} actual / ${formatTime(stats.plannedSeconds)} planned`,
      ].join('\n')
    );
  };

  const createLocalDraft = () => {
    const title = draftPrompt.trim() || 'New AI TodoFlow';
    setLocalResult(
      [
        `Draft TodoFlow: ${title}`,
        '1. Clarify the outcome - 25 min',
        '2. Work on the main task - 50 min',
        '3. Review and adjust - 15 min',
      ].join('\n')
    );
  };

  return (
    <div className="ai-page">
      <div className="ai-header">
        <h1 className="text-2xl font-bold text-highlight">AI TodoFlow</h1>
        <button className="btn btn-secondary dashboard-month-button" onClick={fetchItems}>
          Refresh
        </button>
      </div>

      <div className="ai-grid">
        <section className="ai-panel card">
          <h2>Analyze</h2>
          <textarea
            className="input input-primary ai-textarea"
            value={analysisPrompt}
            onChange={(event) => setAnalysisPrompt(event.target.value)}
            placeholder="Analyze schedule pressure, unfinished tasks, or focus time"
          />
          <button className="btn btn-primary w-full h-[36px]" onClick={runLocalAnalysis}>
            Analyze
          </button>
        </section>

        <section className="ai-panel card">
          <h2>Create TodoFlow</h2>
          <textarea
            className="input input-primary ai-textarea"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value)}
            placeholder="Describe the goal, duration, and preferred task breakdown"
          />
          <button className="btn btn-primary w-full h-[36px]" onClick={createLocalDraft}>
            Create Draft
          </button>
        </section>

        <section className="ai-panel card ai-result-panel">
          <h2>Result</h2>
          <pre className="ai-result">{localResult || 'No result yet.'}</pre>
        </section>
      </div>

      <section className="ai-context card">
        <h2>TodoFlow Context</h2>
        <div className="ai-context-grid">
          <div>
            <span>TodoFlows</span>
            <strong>{stats.totalTodoFlows}</strong>
          </div>
          <div>
            <span>Scheduled days</span>
            <strong>{stats.scheduledDays}</strong>
          </div>
          <div>
            <span>Planned</span>
            <strong>{formatTime(stats.plannedSeconds)}</strong>
          </div>
          <div>
            <span>Actual</span>
            <strong>{formatTime(stats.actualSeconds)}</strong>
          </div>
        </div>
        <div className="ai-recent-list">
          {recentTodos.map((todo) => (
            <div key={todo.id} className="ai-recent-item">
              <strong>{todo.note || 'TodoFlow'}</strong>
              <span>{getTodoScheduleDateKeys(todo).join(', ') || 'Unscheduled'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AiFlow;
