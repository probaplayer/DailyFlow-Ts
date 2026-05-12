import { useNavigate } from 'react-router-dom';
import { IoAddCircleOutline, IoSettingsOutline } from "react-icons/io5";
import { useContext, useEffect, useRef, useState } from "react";
import Task from "~/ui/components/Task/Task";
import { calculateProgressWidth, formatTime, generateId, getOnLeftInScreen } from "~/ui/helpers/utils/utils";
import { useAppSelector, useAppDispatch } from "~/ui/store/hooks";
import { 
  initializeTodoFlow, 
  addTask,
  setTodoStatus,
  setNote,
  setStopTimer,
  setStartTimer,
  setTimeLeft,
  setDoneAndNextTask,
  setChangeCurrentTask,
  setTaskStatus,
  setResetTodoFlow,
  addAndSetTaskBreak,
} from "~/ui/store/todo/todoSlice";
import { useAlert } from "~/ui/helpers/hooks/useAlert";
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { IoHomeOutline } from "react-icons/io5";
import { IoMdArrowRoundUp } from "react-icons/io";
import { RiCollapseDiagonalFill, RiResetLeftLine } from "react-icons/ri";
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import TaskPlayer from '~/ui/components/TaskPlayer/TaskPlayer';
import SoundPlayer from '~/ui/helpers/utils/SoundPlayer';
import { SoundType } from '~/enums/Sound.Type.enum';
import { FaMinus } from 'react-icons/fa';
import InputHandler from '~/ui/components/InputHandler/InputHandler';

const Todoflow = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { info, notify } = useAlert();
  const todoFlow = useAppSelector((state) => state.todoflow);
  const containerTaskDiv = useRef<(HTMLDivElement | null)>(null);
  const [noteError, setNoteError] = useState<string>('');
  const [triggerTaskValidation, setTriggerTaskValidation] = useState<boolean>(false);
  const [isNewTodo, setIsNewTodo] = useState<boolean>(true);
  const soundPlayer = SoundPlayer.getInstance();

  useEffect(() =>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.TODOFLOW);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60, 
        getOnLeftInScreen(currentWidth, currentHeight, width, height));
    }
    handleToResize();
  },[])

  useEffect(() => {
    const fetchAndInitialize = async () => {
      if (todoFlow.id) {
        setIsNewTodo(false);
        if (todoFlow.status === TodoStatus.START_ON_TODO && todoFlow.currentTaskId && todoFlow.tasks[todoFlow.currentTaskId]?.status === TaskStatus.IN_PROGRESS) {
          dispatch(setStartTimer(setInterval(() => {
             dispatch(setTimeLeft(undefined));
          }, 1000)));
        }
        await window.electronAPI.setWindowAlwaysOnTop('main', true);
      } else {
        setIsNewTodo(true);
        const newId = generateId();
        dispatch(initializeTodoFlow({ id: newId }));
      }
    }
    fetchAndInitialize();
    return () => {
      dispatch(setStopTimer());
    }
  }, []);

  useEffect(() =>{
    const handleByStatusChange = async () => {
      if(todoFlow.status === TodoStatus.STOP){
        const currentTask = todoFlow.currentTaskId;
        const isTaskBreak = currentTask ? todoFlow.tasks[currentTask]?.isTaskBreak : false;
        const isTaskCompleted = currentTask ? todoFlow.tasks[currentTask]?.status === TaskStatus.COMPLETED : false;
        const canTaskPlay = currentTask && isTaskBreak && !isTaskCompleted;
        if (canTaskPlay){
          dispatch(setStartTimer(setInterval(() => {
             dispatch(setTimeLeft(undefined));
          }, 1000)));
        }
        else{
          dispatch(setStopTimer());
        }
        await window.electronAPI.setWindowAlwaysOnTop('main', false);
      }
      else if(todoFlow.status === TodoStatus.START_ON_PROGRESS){
        navigate(`/ontask`);
        await window.electronAPI.setWindowAlwaysOnTop('main', true);
      }
    }

    handleByStatusChange();
  },[todoFlow.status])

  useEffect(() => {
    const checkTimeEst = async () => {
      const currentTask = todoFlow.currentTaskId && todoFlow.tasks[todoFlow.currentTaskId];
      if (!currentTask || currentTask.status !== TaskStatus.IN_PROGRESS) return;

      const { estimatedTime, isTaskBreak } = currentTask;
      const { timeLeft } = todoFlow;

     const shouldNotify = 
        estimatedTime > 0 && 
        (timeLeft === estimatedTime || (timeLeft === 0 && isTaskBreak));

      if (shouldNotify) {
        try {
          let message = null;
          if (isTaskBreak){
            message = { title: 'Break Time Over', body: 'Your break time is over. Time to get back to work!' };
            soundPlayer.play(SoundType.SOUND_SHINDERU);
          }else{
            message = { title: 'Deadline Approaching', body: 'You are getting close to the deadline. Please complete your task on time.' };
            soundPlayer.play(SoundType.SOUND_HAYAY);
          }
          dispatch(setStopTimer());
          await notify(message.title, message.body);
        } catch (err) {
          console.error('Failed to show notification:', err);
        }
      }
    };

    checkTimeEst();
  }, [todoFlow.timeLeft]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setNote(value));
    if (noteError && value.trim()) {
      setNoteError('');
    }
  };

  const handleNoteBlur = () => {
    if (!todoFlow.note.trim()) {
      setNoteError('Note cannot be empty');
    }
  };

  const handleAddNewTask = async () => {
    const newTask: Task = { 
      id: generateId(), 
      title: '', 
      estimatedTime: 0, 
      actualTime: 0, 
      subTasks: [], 
      status: 'Not Started' 
    };
    dispatch(addTask(newTask));
  }

  const validationRules = () => {
    let valid = true;

    if (!todoFlow.note.trim()) {
      setNoteError('Note cannot be empty');
      valid = false;
    }

    if (todoFlow.taskIds.length === 0) {
      info('Please add at least one task before starting.');
      return false;
    }

    setTriggerTaskValidation(true);
    setTimeout(() => {
      setTriggerTaskValidation(false);
    }, 100);

    const hasEmptyTasks = todoFlow.taskIds.some(taskId => {
      const task = todoFlow.tasks[taskId];
      return !task || !task.title.trim();
    });

    if (hasEmptyTasks) {
      valid = false;
    }

    const hasEmptySubtasks = todoFlow.taskIds.some(taskId => {
      const task = todoFlow.tasks[taskId];
      if (task) {
        return task.subTasks.some(subTask => !subTask.title.trim());
      }
      return false;
    });

    if (hasEmptySubtasks) {
      valid = false;
    }

    if (!valid) {
      info('Please fix the errors in the tasks before starting.');
        setTimeout(() => {
        const firstErrorElement = document.querySelector('.input-error') as HTMLInputElement;
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorElement.focus();
        }
      }, 150);
    }

    return valid; 
  };

  const handleToStart = async () => {
    let isValid = validationRules();
    if (!isValid) {
      return;
    }
    soundPlayer.play(SoundType.SOUND_GAMBUSTA);
    dispatch(setTodoStatus(TodoStatus.START_ON_PROGRESS));
    handleTodoCreation();
  };

  const handleTodoCreation = async () => {
    try {
      await window.electronAPI.todoUpsert(todoFlow);
      let tasksArray = todoFlow.taskIds;

      for (const taskId of tasksArray) {
        const task = todoFlow.tasks[taskId];
        await window.electronAPI.taskUpsert(task);
      }
      
    } catch (error) {
      console.error('Failed to save todo:', error);
      info('Failed to save todo');
    }
  };

  return (
    <div className="h-full">
      <div className="mb-2 flex items-center justify-between" >
        <div className='flex items-center w-full'>
          <button className='btn btn-icon' onClick={() =>{
            dispatch(setStopTimer());
            window.electronAPI.setWindowAlwaysOnTop('main', false);
            navigate('/dashboard');
          }}><IoHomeOutline /></button>
          <div className="text-sm text-gray-500 flex items-center gap-1 flex-1">
            <p className='drag-area'>
              {isNewTodo ? '🆕' : '✏️'}
            </p>
            <div className='flex-1'>
              <input 
                type="text" 
                className={`input input-primary z-50 ${noteError ? 'input-error' : ''}`} 
                placeholder="Note" 
                value={todoFlow.note}
                onChange={handleNoteChange}
                onBlur={handleNoteBlur}
              />
              {noteError && <p className="text-red-500 text-sm mt-1">{noteError}</p>}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <button className="btn btn-icon" onClick={() => {dispatch(setResetTodoFlow())}}>
            <RiResetLeftLine />
          </button>
          {
            todoFlow.timer && (
              <button className="btn btn-icon" onClick={() => {
                const isValid = validationRules();
                if (!isValid) return;
                dispatch(setTodoStatus(TodoStatus.START_ON_PROGRESS));
              }}>
                <RiCollapseDiagonalFill />
              </button>
            )
          }
          <button
            className="btn btn-icon"
            onClick={() => {
              navigate('/setting');
            }}
          >
            <IoSettingsOutline />
          </button>
          <button
            className="btn btn-icon"
            onClick={async () => {
              await window.electronAPI.appMinimize();
            }}
          >
            <FaMinus className='cursor-pointer animate-pop' />
          </button>
        </div>
      </div>
  
      <div className="card mt-3">
        <div className='flex items-center justify-between'>
          <div>
            <span>Status: </span> <span className="text-highlight">{todoFlow.status == TodoStatus.STOP ? 'Stop' : 'Start'}</span>
          </div>
          <div>
            <span>Est: </span> <span className={todoFlow.actualTimeTodo > todoFlow.estimatedTimeTodo ? 'text-orange-500' : ''}>{formatTime(todoFlow.actualTimeTodo)} / {formatTime(todoFlow.estimatedTimeTodo)}</span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className="progress progress-xl">
              <div className="progress-bar" style={{ width: calculateProgressWidth(todoFlow.taskCompleted, todoFlow.taskTotal) }}></div>
          </div>
          <p className='whitespace-nowrap'>{`${todoFlow.taskCompleted}/${todoFlow.taskTotal} done`}</p>
        </div>
      </div>
      {!todoFlow.currentTaskId && 
        <div className='flex gap-2 mt-3'>
          <button 
            className={`btn btn-primary flex-5 w-full h-[35px] text-xxl ${todoFlow.status === 'Start' ? 'disabled' : ''}`} 
            onClick={handleToStart}
          >
            Start
          </button>
        </div>        
       }
      <button className="btn btn-secondary mt-3 w-full h-[30px] text-2xl flex items-center justify-center"
        onClick={handleAddNewTask}>
        <IoAddCircleOutline />
      </button>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 275px)' }} ref={containerTaskDiv}>
        {todoFlow.currentTaskId && (
          <TaskPlayer 
            task={todoFlow.tasks[todoFlow.currentTaskId]}
            isTimer={todoFlow.timer === null}
            isDoneTodo={todoFlow.taskCompleted === todoFlow.taskTotal} 
            onTakeBreak={() => {
              dispatch(addAndSetTaskBreak());
              soundPlayer.play(SoundType.SOUND_CAU_MET_LAM_HA);
              dispatch(setStartTimer(setInterval(() => {
                dispatch(setTimeLeft(undefined));
              }, 1000)));
            }}
            onStartTask={() => {
              soundPlayer.play(SoundType.SOUND_SUGOI_SUGOI);
              dispatch(setStartTimer(setInterval(() => {
                dispatch(setTimeLeft(undefined));
              }, 1000)));
            }}
            onPauseTask={() => {
              dispatch(setStopTimer());
            }}
            onDoneTask={() => {
              if (todoFlow.currentTaskId) {
                const currentTask = todoFlow.tasks[todoFlow.currentTaskId];
                if (currentTask.isTaskBreak) {
                  soundPlayer.play(SoundType.SOUND_SHINDERU);
                  dispatch(setStopTimer());
                } else {
                  soundPlayer.play(SoundType.SOUND_BOCCHI);
                }
                dispatch(setTaskStatus(TaskStatus.COMPLETED));
                dispatch(setTodoStatus(TodoStatus.STOP));
              }
            }}
            onDoneAndNextTask={() => {
              const isValid = validationRules();
              if (!isValid) return;
              soundPlayer.play(SoundType.SOUND_GAMBUSTA);
              dispatch(setDoneAndNextTask());            
            }}
            onChangeTask={(next: boolean, status: string) => {
              if (todoFlow && todoFlow.currentTaskId) {
                  dispatch(setChangeCurrentTask({ isNext: next, status: status as TaskStatus }));
                  dispatch(setStartTimer(setInterval(() => {
                    dispatch(setTimeLeft(undefined));
                  }
                  , 1000)));
                  return true;
                }
                else
                  return false;
              }
            }
          />
        )}
        {todoFlow.taskIds.filter(id => id !== todoFlow.currentTaskId && todoFlow.tasks[id].status !== TaskStatus.COMPLETED).map((taskIds, index) => (
          <Task key={taskIds} taskId={taskIds} index={todoFlow.currentTaskId ? index + 1 : index} triggerValidation={triggerTaskValidation} />
        ))}
      </div>
      <button className='absolute bottom-4 left-4 btn btn-icon primary rounded-full text-4xl'
        onClick={() =>{
          if (containerTaskDiv.current) {
            containerTaskDiv.current.scrollTo({
              top: 0,
              behavior: "smooth"
            });
          }
        }}
      >
        <IoMdArrowRoundUp />
      </button>
      <InputHandler />
    </div>
  );
};

export default Todoflow;
