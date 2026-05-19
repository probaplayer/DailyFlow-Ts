import { createSlice, PayloadAction  } from '@reduxjs/toolkit';
import { PrefixType } from '~/enums/Prefix.Type.enum';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { generateId } from '~/ui/helpers/utils/utils';
import { redistributeTaskEstimateWithinTodo } from '~/ui/helpers/utils/scheduleUtils';

const initialState: TodoFlow = {
  id: '',
  note: '',
  status: TodoStatus.STOP,
  taskCompleted: 0,
  taskTotal: 0,
  estimatedTimeTodo: 0,
  actualTimeTodo: 0,
  taskIds: [],
  tasks: {},
  currentTaskId: undefined,
  timeLeft: 0,
  timer: null
};

const todoflowSlice = createSlice({
  name: 'todoflow',
  initialState,
  reducers: {
    initializeTodoFlow: (state, action: PayloadAction<{ id: string }>) => {
      state.id = action.payload.id;
      state.note = '';
      state.status = TodoStatus.STOP;
      state.taskCompleted = 0;
      state.taskTotal = 0;
      state.estimatedTimeTodo = 0;
      state.actualTimeTodo = 0;
      state.taskIds = [];
      state.tasks = {};
      state.currentTaskId = undefined;
      state.timeLeft = 0;
      state.timer = null;
    },

    setTodo: (state, action: PayloadAction<TodoFlow>) => {
      return { ...state, ...action.payload};
    },
    
    addTask: (state, action: PayloadAction<Task>) => {
      const task = action.payload;
      state.tasks[task.id] = task;
      state.taskIds.push(task.id);
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
      todoflowSlice.caseReducers.inputIdToFocus(state, { payload: task.id, type: 'inputIdToFocus' });
    },

    addAndSetTaskBreak: (state) => {
      const newId = PrefixType.BREAK_PREFIX + generateId();

      let breakTime = 5; 
      try {
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          breakTime = parsedSettings.breakTime ?? 300;
        }
      } catch (error) {
        console.warn('Failed to load breakTime from settings, using default:', error);
      }

      const breakTaskIds = state.taskIds.filter(id => id.includes(PrefixType.BREAK_PREFIX));
      if (breakTaskIds.length > 0) {
        for (const id of breakTaskIds) {
          delete state.tasks[id];
          state.taskIds = state.taskIds.filter(tid => tid !== id);
        }
      }
      
      const breakTask = {
        id: newId,
        title: 'Take a break',
        estimatedTime: breakTime + 1,
        actualTime: breakTime,
        subTasks: [],
        isTaskBreak: true,
        status: 'Not Started'
      }
      state.tasks[newId] = breakTask;
      state.taskIds.push(newId);
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
      state.currentTaskId = newId;
      state.timeLeft = breakTime;
    },
    
    removeTask: (state, action: PayloadAction<string>) => {
      const taskIdToRemove = action.payload;

      const tasksIdExpecBreak = state.taskIds.filter(id => !id.includes(PrefixType.BREAK_PREFIX));
      const originalIndex = tasksIdExpecBreak.indexOf(taskIdToRemove);

      delete state.tasks[taskIdToRemove];
      state.taskIds = state.taskIds.filter(id => id !== taskIdToRemove);
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
      
      let itemIdToFocus: string | undefined;
      
      if (tasksIdExpecBreak.length > 0) {
        if (originalIndex > 0 && originalIndex <= tasksIdExpecBreak.length) {
          itemIdToFocus = tasksIdExpecBreak[originalIndex - 1];
        } else if (originalIndex === 0 && tasksIdExpecBreak.length > 0) {
          itemIdToFocus = tasksIdExpecBreak[0];
        }
      }
      if (itemIdToFocus) {
        todoflowSlice.caseReducers.inputIdToFocus(state, { payload: itemIdToFocus, type: 'inputIdToFocus' });
      }
    },
    
    updateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const { id, updates } = action.payload;
      if (state.tasks[id]) {
        if (updates.estimatedTime !== undefined) {
          const updatedTodo = redistributeTaskEstimateWithinTodo(state, id, updates.estimatedTime);
          return {
            ...updatedTodo,
            tasks: {
              ...updatedTodo.tasks,
              [id]: {
                ...updatedTodo.tasks[id],
                ...updates,
                estimatedTime: updatedTodo.tasks[id].estimatedTime,
              },
            },
          };
        }
        state.tasks[id] = { ...state.tasks[id], ...updates };
        todoflowSlice.caseReducers.calculateEstimatedTime(state);
      }
    },

    addSubTask: (state, action: PayloadAction<{ taskId: string; subTask: SubTask }>) => {
      const { taskId, subTask } = action.payload;
      if (state.tasks[taskId]) {
        state.tasks[taskId].subTasks.push(subTask);
      }
    },
    
    reorderTasks: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      if (toIndex < 0 || toIndex >= state.taskIds.length) return;
      if (fromIndex < 0 || fromIndex >= state.taskIds.length) return;
      if (fromIndex === toIndex) return;
      
      const newtaskIds = [...state.taskIds];
      const [movedItem] = newtaskIds.splice(fromIndex, 1);
      newtaskIds.splice(toIndex, 0, movedItem);
      state.taskIds = newtaskIds;
      todoflowSlice.caseReducers.inputIdToFocus(state, { payload: movedItem, type: 'inputIdToFocus' });
    },
    
    calculateEstimatedTime: (state) => {
      const totalEstimatedTime = state.taskIds.filter(id => !id.includes(PrefixType.BREAK_PREFIX)).reduce((total, taskIds) => {
        const task = state.tasks[taskIds];
        return total + (task ? task.estimatedTime : 0);
      }, 0);
      const numberOfCompletedTasks = state.taskIds.filter(id => !id.includes(PrefixType.BREAK_PREFIX)).reduce((count, taskIds) => {
        const task = state.tasks[taskIds];
        return count + (task && task.status === TaskStatus.COMPLETED ? 1 : 0);
      }, 0);
      const taskTotal = state.taskIds.filter(id => !id.includes(PrefixType.BREAK_PREFIX)).length;
      state.taskTotal = taskTotal;
      state.taskCompleted = numberOfCompletedTasks;
      state.estimatedTimeTodo = totalEstimatedTime;
    },

    setNote: (state, action: PayloadAction<string>) => {
      state.note = action.payload;
    },

    setTodoStatus: (state, action: PayloadAction<TodoStatus>) => {
      state.status = action.payload;
      if (state.status === TodoStatus.START_ON_PROGRESS){
        if (state.taskCompleted === state.taskTotal) {
          state.currentTaskId = undefined;
          state.timeLeft = 0;
          state.taskIds.forEach(taskId => {
            state.tasks[taskId].status = TaskStatus.NOT_STARTED;
            state.tasks[taskId].actualTime = 0;
          });
          state.taskCompleted = 0;
        }
      }
    },

    setTaskStatus: (state, action: PayloadAction<TaskStatus>) => {
      const taskId = state.currentTaskId;
      if (!taskId || !state.tasks[taskId]) return;
      
      const task = state.tasks[taskId];
      task.status = action.payload;
      
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
      
    },

    setCurrentTaskId: (state, action: PayloadAction<string | undefined>) => {
      state.currentTaskId = action.payload;
      if (state.currentTaskId && state.tasks[state.currentTaskId]) {
        const currentTask = state.tasks[state.currentTaskId];
        state.timeLeft = currentTask.actualTime;
        if (state.timeLeft < 0) {
          state.timeLeft = 0;
        }
      } else {
        state.timeLeft = 0;
      }
    },
    
    setTimeLeft: (state, action: PayloadAction<number | undefined>) => {
      const task = state.currentTaskId && state.tasks[state.currentTaskId];
      if (!task) return;

      if (action.payload === undefined) {
        if (state.timer == null) return;
        const timeLeft = state.timeLeft ?? (task.isTaskBreak ? 0 : 0);
        state.timeLeft = Math.max(0, task.isTaskBreak ? timeLeft - 1 : timeLeft + 1);
        state.actualTimeTodo = state.actualTimeTodo + 1;
      } else {
        state.timeLeft = action.payload;
      }

      task.actualTime = state.timeLeft;
    },

    setStartTimer: (state, action: PayloadAction<NodeJS.Timeout | null>) => {
      if (state.timer != null) {
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

    setStopTimer: (state) => {
      if (state.timer != null) {
        const currentTaskStatus =  state.tasks[state.currentTaskId as string]?.status;
        if (currentTaskStatus === TaskStatus.IN_PROGRESS && state.currentTaskId) {
          state.tasks[state.currentTaskId as string].status = TaskStatus.PAUSED;
        }
        clearInterval(state.timer);
        state.timer = null;
      }
    },
    setDoneAndNextTask: (state) => {
      if (state.taskCompleted === state.taskTotal) {
        todoflowSlice.caseReducers.setResetTodoFlow(state);
      }
      if (state.currentTaskId && state.tasks[state.currentTaskId]) {
        todoflowSlice.caseReducers.setChangeCurrentTask(state, 
          { payload: { isNext: true, status: TaskStatus.COMPLETED }, 
          type: 'setChangeCurrentTask' }
        );  
        todoflowSlice.caseReducers.calculateEstimatedTime(state);
        const breakTaskIds = state.taskIds.filter(id => id.includes(PrefixType.BREAK_PREFIX));
        if (breakTaskIds.length > 0) {
          for (const id of breakTaskIds) {
            delete state.tasks[id];
            state.taskIds = state.taskIds.filter(tid => tid !== id);
          }
        }
        state.status = TodoStatus.START_ON_PROGRESS;
      }
    },

    setChangeCurrentTask: (state, action: PayloadAction<{ isNext: boolean; status: TaskStatus }>) => {
      const { isNext, status } = action.payload;
      if (state.currentTaskId) {
        const incompleteTaskIds = state.taskIds.filter(id => state.tasks[id].status !== TaskStatus.COMPLETED);
        const currentIndex = incompleteTaskIds.indexOf(state.currentTaskId);
        const nextIndex = isNext ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < incompleteTaskIds.length) {
          const nextTaskId = incompleteTaskIds[nextIndex];
          state.tasks[state.currentTaskId].status = status;
          state.currentTaskId = nextTaskId;
          state.timeLeft = state.tasks[nextTaskId]?.actualTime || 0;
        }
      }
    },

      setResetTodoFlow: (state) => {
        state.taskCompleted = 0;
        state.status = TodoStatus.STOP;
        state.currentTaskId = undefined;
        state.timeLeft = 0;

        if (state.timer != null) {
          clearInterval(state.timer);
          state.timer = null;
        }

        const nonBreakTaskIds = state.taskIds.filter(id => !id.includes(PrefixType.BREAK_PREFIX));
        const newTasks: Record<string, Task> = {};
        nonBreakTaskIds.forEach(id => {
          const t = state.tasks[id];
          if (t) {
            newTasks[id] = { ...t, status: TaskStatus.NOT_STARTED, actualTime: 0 };
          }
        });

        state.tasks = newTasks;
        state.taskIds = nonBreakTaskIds;
        state.taskTotal = state.taskIds.length;
        state.actualTimeTodo = 0;
        todoflowSlice.caseReducers.calculateEstimatedTime(state);
      },

      insertNewTaskAtCurrentPosition: (state, action: PayloadAction<{ index: number, isDown: boolean }>) => {
        const { index, isDown } = action.payload;
        const insertIndex = isDown ? index + 1 : index;
        const task: Task = {
          id: generateId(),
          title: '',
          estimatedTime: 0,
          actualTime: 0, 
          subTasks: [],
          isTaskBreak: false,
          status: TaskStatus.NOT_STARTED
        };
        state.tasks[task.id] = task;
        state.taskIds.splice(insertIndex, 0, task.id);
        state.taskTotal = state.taskIds.length;  
        todoflowSlice.caseReducers.calculateEstimatedTime(state);
        todoflowSlice.caseReducers.inputIdToFocus(state, { payload: task.id, type: 'inputIdToFocus' });
      },

      inputIdToFocus: (state, action: PayloadAction<string>) => {
        const inputId = action.payload;
          setTimeout(() => {
            const inputElement = document.querySelector(`.input-${inputId}`) as HTMLInputElement | null;
            if (!inputElement) return;
            inputElement.focus();
            inputElement.select();
          }, 100);
      }

  },
});

export const {
  initializeTodoFlow,
  setTodo,
  addTask,
  addAndSetTaskBreak,
  removeTask,
  updateTask,
  addSubTask,
  reorderTasks,
  calculateEstimatedTime,
  setTodoStatus,
  setTaskStatus,
  setNote,
  setCurrentTaskId,
  setTimeLeft,
  setStartTimer,
  setStopTimer,
  setDoneAndNextTask,
  setChangeCurrentTask,
  setResetTodoFlow,
  insertNewTaskAtCurrentPosition,
  inputIdToFocus
} = todoflowSlice.actions;

export default todoflowSlice.reducer;
