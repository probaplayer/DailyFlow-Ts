import { useContext, useEffect, useRef, useState } from 'react';
import './Focus.css';
import { PageType } from '~/enums/PageType.enum';
import { formatTime, getOnTopRightInScreen } from '~/ui/helpers/utils/utils';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import { FaPause, FaPlay } from "react-icons/fa";
import { MdSkipNext } from "react-icons/md";
import { BiSkipPrevious } from "react-icons/bi";
import { TbLayoutBottombarCollapseFilled } from "react-icons/tb";
import { TbLayoutNavbarCollapseFilled } from "react-icons/tb";
import { getPageSize } from '~/shared/util.page';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '~/ui/store/hooks';
import { setCurrentTaskId, setStartTimer, setTodoStatus, setStopTimer, setTimeLeft, updateTask, setTaskStatus, setChangeCurrentTask } from '~/ui/store/todo/todoSlice';
import { IoChevronBack } from "react-icons/io5";
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { FaMinus } from "react-icons/fa6";
import SoundPlayer from '~/ui/helpers/utils/SoundPlayer';
import { SoundType } from '~/enums/Sound.Type.enum';
import { mainWindowResizeState } from '~/ui/helpers/utils/pageResizeState';


const Focus = () => {
  const navigate = useNavigate();
  const soundPlayer = SoundPlayer.getInstance();
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isTitleHovered, setisTitleHovered] = useState(false);
  const [isTimeHovered, setisTimeHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const todo = useAppSelector((state) => state.todoflow);
  const {  
    notify
  } = useAlert();

  const getPersistableTodo = (nextTodo: TodoFlow): TodoFlow => ({
    ...nextTodo,
    timer: null,
  });

  const persistTodo = async (nextTodo: TodoFlow = todo) => {
    if (!nextTodo.id || !nextTodo.note.trim()) return;

    try {
      const persistableTodo = getPersistableTodo(nextTodo);
      await window.electronAPI.todoUpsert(persistableTodo);
      for (const taskId of persistableTodo.taskIds) {
        const task = persistableTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
    } catch (err) {
      console.error('Failed to persist todo:', err);
    }
  };

  useEffect(() => {
    const getHeadTask = async () => {
      if (!todo) {
        navigate('/dashboard');
        return;
      }
      if (!todo.currentTaskId){
        const incompleteTasks = todo.taskIds.filter(taskId => todo.tasks[taskId].status !== TaskStatus.COMPLETED);
        if (incompleteTasks.length > 0) {
          const firstTaskId = incompleteTasks[0];
          dispatch(setCurrentTaskId(firstTaskId));
        }
      }
      if (todo.timer == null) {
        startTimer();
      }
    }

    getHeadTask();
    handleToWinOnTop(true);
  }, []);

  useEffect(() => {
    if (textContainerRef.current && textRef.current) {
      const containerWidth = textContainerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      setShouldAnimate(textWidth > containerWidth);
    }

  }, [todo]);

  useEffect(() => {
    const checkTimeEst = async () => {
      const currentTask = todo.currentTaskId && todo.tasks[todo.currentTaskId];
      if (!currentTask || currentTask.status !== TaskStatus.IN_PROGRESS) return;

      const { estimatedTime, isTaskBreak } = currentTask;
      const { timeLeft } = todo;

      const shouldNotify = 
        estimatedTime > 0 && 
        (timeLeft === estimatedTime || (timeLeft === 0 && isTaskBreak));

      if (shouldNotify) {
        try {
          const message = isTaskBreak
            ? { title: 'Break Time Over', body: 'Your break time is over. Time to get back to work!' }
            : { title: 'Deadline Approaching', body: 'You are getting close to the deadline. Please complete your task on time.' };
          soundPlayer.play(SoundType.SOUND_HAYAY);
          dispatch(setStopTimer());
          await notify(message.title, message.body);
        } catch (err) {
          console.error('Failed to show notification:', err);
        }
      }
    };
    checkTimeEst();
  }, [todo.timeLeft]);

  useEffect(() => {
    const handleUpdateTodo = async () => {
      if (todo) {
        try {
          await persistTodo();
          if (todo.status === TodoStatus.STOP || todo.status === TodoStatus.START_ON_TODO) {
            handleToWinOnTop(false);
            navigate(`/todoflow`);
          }
        } catch (err) {
          console.error('Failed to update todo:', err);
        }
      }
    }
    handleUpdateTodo();
  }, [todo.status]);

  useEffect(() => {
    if (!todo.id || !todo.note.trim()) return;

    const timeoutId = window.setTimeout(() => {
      persistTodo();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    todo.id,
    todo.note,
    todo.status,
    todo.taskCompleted,
    todo.taskTotal,
    todo.estimatedTimeTodo,
    todo.actualTimeTodo,
    todo.currentTaskId,
    todo.timeLeft,
    todo.taskIds,
    todo.tasks,
  ]);

  useEffect(() => {
    const handleToResize = async () => {
      let pageType = PageType.FOCUS;
      if (isExpanded) {
        pageType = PageType.FOCUS_EXPANDED;
      }
      if (!mainWindowResizeState.shouldResize(pageType)) {
        return;
      }

      const {width, height} = getPageSize(pageType);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove('main', width, height, 24, 
        getOnTopRightInScreen(currentWidth, currentHeight, width, height));
      mainWindowResizeState.markResized(pageType);
    }
    handleToResize();
  }, [isExpanded]);

  const startTimer = () => {
    dispatch(setStartTimer(setInterval(() => {
      dispatch(setTimeLeft(undefined));
    }, 1000)));
  };

  const pauseTimer = () => {
    dispatch(setStopTimer());
  }

  const handleExpand = () => {
    setIsExpanded(prev => !prev);
  }

  const handleChangeTask = (isNext: boolean, _status: TaskStatus) => {
    if (todo && todo.currentTaskId) {
      dispatch(setChangeCurrentTask({isNext, status: _status}));
      startTimer();
    }
  }

  const handleToCheckSubTask = (subTasks: SubTask, index: number) => {
    if (!todo.currentTaskId) return;
    const updatedSubTasks = todo.tasks[todo.currentTaskId].subTasks.map((st, idx) =>
      idx === index ? { ...st, completed: !st.completed } : st
    );
    const updatedTask = { ...todo.tasks[todo.currentTaskId], subTasks: updatedSubTasks };
    dispatch(updateTask({ id: todo.currentTaskId, updates: updatedTask }));
  }

  const handleDoneTask = () => {
    if (todo.currentTaskId) {
      if (todo.tasks[todo.currentTaskId].isTaskBreak) 
        soundPlayer.play(SoundType.SOUND_SHINDERU);
      else
        soundPlayer.play(SoundType.SOUND_BOCCHI);
      dispatch(setStopTimer());
      dispatch(setTaskStatus(TaskStatus.COMPLETED));
      dispatch(setTodoStatus(TodoStatus.STOP));
    }
  }

  const handleToWinOnTop = async (isTop: boolean) => {
    await window.electronAPI.setWindowAlwaysOnTop('main', isTop);
  }

  const canChangeTask = todo.currentTaskId && todo.tasks[todo.currentTaskId]?.isTaskBreak;
  const isCurrentTaskBreak = todo.currentTaskId && todo.tasks[todo.currentTaskId]?.isTaskBreak;
  const isPaused = todo.timer != null;


  return (
    <div className='h-full FocusPage'>
      <div className={`flex gap-2 justify-between items-center px-1 sticky top-3 z-50 drag-area`}>
        <div className='h-full  flex items-center'>
          <button className='btn btn-icon !p-1 animate-pop no-drag'
            onClick={() => {
              dispatch(setTodoStatus(TodoStatus.START_ON_TODO));
            }}
          >
            <IoChevronBack />
          </button>
        </div>

        <div 
          className='w-1 flex-5 overflow-hidden whitespace-nowrap' 
          ref={textContainerRef}
          onMouseEnter={() => setisTitleHovered(true)}
          onMouseLeave={() => setisTitleHovered(false)}
        >
          <div
            ref={textRef}
            className={shouldAnimate && isTitleHovered ? 'animate-marquee' : 'truncate'}
          >
            {todo.currentTaskId ? todo.tasks[todo.currentTaskId].title : ''}
          </div>
        </div>
        <div 
          className='flex-1 flex items-center h-full no-drag'
          onMouseEnter={() => setisTimeHovered(true)}
          onMouseLeave={() => setisTimeHovered(false)}
        >
          {
            !isTimeHovered ? 
              <span className='font-bold'>{todo.timeLeft != null ? formatTime(todo.timeLeft) : 'N/A'}</span> : 
              <div className='flex gap-1 justify-between items-center w-full'>
                <button className='btn btn-primary h-[10px] w-[1px] text-sm' onClick={handleDoneTask}>Done!</button>

                {canChangeTask ? null : (
                  <BiSkipPrevious className='cursor-pointer animate-pop' onClick={() => {handleChangeTask(false, TaskStatus.PAUSED);}}/>
                )}          

                {isPaused && !isCurrentTaskBreak && (
                  <FaPause className='cursor-pointer animate-pop' onClick={() => {pauseTimer();}}/> 
                )}
                
                {!isPaused && !isCurrentTaskBreak && (
                  <FaPlay
                    className='cursor-pointer animate-pop'
                    onClick={() => {
                      if (todo.currentTaskId) {
                        startTimer();
                      }
                    }}
                  />
                )}
                
                {canChangeTask ? null : (
                  <MdSkipNext className='cursor-pointer animate-pop' onClick={() => {handleChangeTask(true, TaskStatus.PAUSED);}}/>
                )}
                {
                  isExpanded ?
                  <TbLayoutNavbarCollapseFilled className='cursor-pointer animate-pop' onClick={handleExpand}/>
                  :
                  <TbLayoutBottombarCollapseFilled className='cursor-pointer animate-pop' onClick={handleExpand}/>
                }

                <FaMinus className='cursor-pointer animate-pop' 
                          onClick={async () => {
                  await window.electronAPI.appMinimize();
                }}
                />
                
              </div>
          }
        </div>
      </div>
      {isExpanded && todo.currentTaskId && todo.tasks[todo.currentTaskId]?.subTasks
        ? 
          <div className='card mt-5 h-[135px] ml-2 mr-2 flex flex-col gap-2 overflow-auto' style={{padding: '5px'}}>
            {todo.tasks[todo.currentTaskId].subTasks.map((subTask, index) => (
              <div key={index} className={`w-full px-1`}>
                <div className="flex items-center gap-1 w-full">
                  <input type="checkbox" className="checkbox" checked={subTask.completed}
                    onChange={() => {
                      handleToCheckSubTask(subTask, index);
                    }}
                  />
                  <div className="flex-1">
                    <div className="truncate">{subTask.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        : null
      }

    </div>
  );
};

export default Focus;
