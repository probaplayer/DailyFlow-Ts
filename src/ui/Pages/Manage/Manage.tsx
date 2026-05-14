import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TodoInfo from '~/ui/components/TodoInfo/TodoInfo';
import TaskInfo from '~/ui/components/TaskInfo/TaskInfo';
import { useAppDispatch } from '~/ui/store/hooks';
import { setTodo } from '~/ui/store/todo/todoSlice';
import { createTodoFlowFromTask } from '~/ui/helpers/utils/scheduleUtils';
import { generateId } from '~/ui/helpers/utils/utils';
import { PageType } from '~/enums/PageType.enum';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import './Manage.css';

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const Manage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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

  const openTodo = (todo: TodoFlow) => {
    dispatch(setTodo(withoutRuntimeTimer(todo)));
    navigate('/todoflow', { state: { mode: 'edit' } });
  };

  const startTaskAsTodo = (task: Task) => {
    const todo = createTodoFlowFromTask(task, generateId(), generateId());
    dispatch(setTodo(todo));
    navigate('/todoflow', { state: { mode: 'create' } });
  };

  return (
    <div className="manage-page">
      <div className="manage-header">
        <h1 className="text-2xl font-bold text-highlight">Manage</h1>
        <button className="btn btn-secondary dashboard-month-button" onClick={fetchItems}>
          Refresh
        </button>
      </div>

      <div className="manage-grid">
        <section className="manage-column card">
          <h2>TodoFlows</h2>
          {todos.length === 0 ? (
            <p className="manage-empty">No TodoFlows.</p>
          ) : (
            todos.map((todo) => (
              <TodoInfo
                key={todo.id}
                todo={todo}
                onMakeTodo={openTodo}
                onDeleted={fetchItems}
                className="w-full action"
              />
            ))
          )}
        </section>

        <section className="manage-column card">
          <h2>Tasks</h2>
          {tasks.length === 0 ? (
            <p className="manage-empty">No standalone tasks.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id}>
                <TaskInfo task={task} className="w-full action" onDeleted={fetchItems} />
                <button className="btn btn-primary btn-sm w-full mt-2" onClick={() => startTaskAsTodo(task)}>
                  Start as TodoFlow
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
};

export default Manage;
