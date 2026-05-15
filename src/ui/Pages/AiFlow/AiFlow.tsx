import { useEffect, useMemo, useState } from 'react';
import { PageType } from '~/enums/PageType.enum';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import {
  createAiTodoFlowAnalysisPrompt,
  createAiTodoFlowPrompt,
  formatDateChipLabels,
  getTodoFlowAnalytics,
  getTodoScheduleDateKeys,
} from '~/ui/helpers/utils/scheduleUtils';
import { formatTime } from '~/ui/helpers/utils/utils';
import AppDropdown from '~/ui/components/AppDropdown/AppDropdown';
import DateChipList from '~/ui/components/DateChipList/DateChipList';
import './AiFlow.css';

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });
type AiProvider = 'openai' | 'anthropic' | 'gemini';

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

const storageKey = 'aiTodoFlowConfig';
const modelOptions: Record<AiProvider, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
};
const providerOptions: { value: AiProvider; label: string }[] = [
  { value: 'openai', label: 'GPT' },
  { value: 'anthropic', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
];

const defaultConfig: AiConfig = {
  provider: 'openai',
  model: modelOptions.openai[0],
  apiKey: '',
};

function loadAiConfig(): AiConfig {
  try {
    const savedConfig = localStorage.getItem(storageKey);
    if (!savedConfig) return defaultConfig;
    const parsed = JSON.parse(savedConfig) as Partial<AiConfig>;
    const provider = parsed.provider && parsed.provider in modelOptions ? parsed.provider : defaultConfig.provider;
    const models = modelOptions[provider];
    return {
      provider,
      model: parsed.model && models.includes(parsed.model) ? parsed.model : models[0],
      apiKey: parsed.apiKey || '',
    };
  } catch {
    return defaultConfig;
  }
}

const AiFlow = () => {
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  const currentModels = modelOptions[config.provider];

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(config));
  }, [config]);

  const updateProvider = (provider: AiProvider) => {
    setConfig((current) => ({
      ...current,
      provider,
      model: modelOptions[provider][0],
    }));
  };

  const runAiRequest = async (prompt: string, nextStatus: string) => {
    setIsLoading(true);
    setStatus(nextStatus);
    setResult('');
    try {
      const response = await window.electronAPI.aiRequest({ ...config, prompt });
      setResult(response);
      setStatus('Done');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const testConfig = async () => {
    await runAiRequest('Reply with exactly: TodoFlow AI config OK', 'Testing config...');
  };

  const analyzeTodoFlow = async () => {
    await runAiRequest(createAiTodoFlowAnalysisPrompt(todos, tasks, analysisPrompt), 'Analyzing TodoFlow data...');
  };

  const createTodoFlowDraft = async () => {
    await runAiRequest(createAiTodoFlowPrompt(todos, tasks, draftPrompt), 'Creating TodoFlow draft...');
  };

  return (
    <div className="ai-page">
      <div className="ai-header">
        <h1 className="text-2xl font-bold text-highlight">AI TodoFlow</h1>
        <button className="btn btn-secondary dashboard-month-button" onClick={fetchItems}>
          Refresh
        </button>
      </div>

      <section className="ai-config card">
        <div>
          <AppDropdown
            label="Provider"
            value={config.provider}
            options={providerOptions}
            disabled={isLoading}
            onChange={updateProvider}
          />
        </div>
        <div>
          <AppDropdown
            label="Model"
            value={config.model}
            options={currentModels.map((model) => ({ value: model, label: model }))}
            disabled={isLoading}
            onChange={(model) => setConfig((current) => ({ ...current, model }))}
          />
        </div>
        <div className="ai-api-key">
          <label>API key</label>
          <input
            className="input input-primary"
            type="password"
            value={config.apiKey}
            onChange={(event) => setConfig((current) => ({ ...current, apiKey: event.target.value }))}
            placeholder="Paste API key"
          />
        </div>
        <button className="btn btn-secondary h-[38px]" disabled={isLoading} onClick={testConfig}>
          Test config
        </button>
      </section>

      <div className="ai-grid">
        <section className="ai-panel card">
          <h2>Analyze</h2>
          <textarea
            className="input input-primary ai-textarea"
            value={analysisPrompt}
            onChange={(event) => setAnalysisPrompt(event.target.value)}
            placeholder="Analyze schedule pressure, unfinished tasks, or focus time"
          />
          <button className="btn btn-primary w-full h-[36px]" disabled={isLoading} onClick={analyzeTodoFlow}>
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
          <button className="btn btn-primary w-full h-[36px]" disabled={isLoading} onClick={createTodoFlowDraft}>
            Create Draft
          </button>
        </section>

        <section className="ai-panel card ai-result-panel">
          <h2>Result</h2>
          {status && <p className="ai-status">{status}</p>}
          <pre className="ai-result">{result || 'No result yet.'}</pre>
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
              <DateChipList labels={formatDateChipLabels(getTodoScheduleDateKeys(todo))} emptyText="Unscheduled" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AiFlow;
