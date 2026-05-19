import { useEffect, useRef, useState } from 'react';
import { formatTime } from '~/ui/helpers/utils/utils';
import { BiSkipPrevious } from 'react-icons/bi';
import { FaPause, FaPlay } from 'react-icons/fa';
import { MdSkipNext } from 'react-icons/md';
import { LuGamepad2 } from "react-icons/lu";
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import myGif from '~/ui/assets/BocchiKitaGIF.gif';
import myGif2 from '~/ui/assets/BocchiKitaGIF2.gif';
import './TaskPlayer.css';

interface TaskPlayerProps {
  task: Task;
  isDoneTodo: boolean;
  isTimer: boolean;
  onStartTask?: () => void;
  onPauseTask?: () => void;
  onDoneTask: () => void;
  onDoneAndNextTask: () => void;
  onChangeTask: (next: boolean, status: string) => void;
  onTakeBreak: () => void;
}

const TaskPlayer = ({ 
  task, 
  isDoneTodo,
  isTimer,
  onStartTask, 
  onPauseTask, 
  onDoneTask, 
  onDoneAndNextTask,
  onChangeTask,
  onTakeBreak
}: TaskPlayerProps) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (textContainerRef.current && textRef.current) {
      const containerWidth = textContainerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      setShouldAnimate(textWidth > containerWidth);
    }
  }, [task.title]);

  const handlePreviousTask = () => {
    onChangeTask(false, TaskStatus.PAUSED);
  };

  const handleNextTask = () => {
    onChangeTask(true, TaskStatus.PAUSED);
  };

  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isPaused = isTimer;
  const statusLabel = task.isTaskBreak ? 'Break' : (isPaused ? 'Paused' : 'Running');

  if (isCompleted) {
    return (
      <div className="task-player-card task-player-card-completed card primary mt-3">
        <div className="task-player-completed-copy">
          <span className="task-player-status task-player-status-done">Completed</span>
          <p className='font-bold'>Congratulations! You've completed the task.</p>
          <p className='task-player-completed-title'>{task.title}</p>
        </div>
        <img 
          src={task.isTaskBreak ? myGif2 : myGif } 
          alt="Task completed" 
          className="task-player-completed-image"
        />
        <div className='task-player-completed-actions'>
          <button className="btn btn-primary !p-2" onClick={onDoneAndNextTask}>
            {isDoneTodo ? 'All Done!' : 'Next Task'}
          </button>
          {!isDoneTodo && 
          <button className='btn btn-secondary !p-1' onClick={onTakeBreak}>
            <LuGamepad2 className='mr-2' />
            Take Break!
          </button>}
        </div>

      </div>
    );
  }

  return (
    <div className="task-player-card card primary mt-3">
      <div 
        className="task-player-title-area" 
        ref={textContainerRef}
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
      >
        <span className={`task-player-status ${isPaused ? 'task-player-status-paused' : 'task-player-status-running'}`}>
          {statusLabel}
        </span>
        <div
          ref={textRef}
          className={`task-player-title ${shouldAnimate && isTitleHovered ? 'animate-marquee' : 'truncate'}`}
        >
          {task.title}
        </div>
      </div>

      <div className="task-player-time">
        <span>Time left</span>
        <strong>{formatTime(task.actualTime)}</strong>
      </div>

      <div className="task-player-actions" aria-label="Task actions">
        {!task.isTaskBreak && (
          <button className='btn btn-icon task-player-icon-btn' onClick={handlePreviousTask} title="Previous task">
            <BiSkipPrevious />
          </button>
        )}

        {isPaused && !task.isTaskBreak && (
          <button className='btn btn-icon task-player-icon-btn' onClick={onStartTask} title="Resume task">
            <FaPlay />
          </button>
        )}

        {!isPaused && !task.isTaskBreak && (
          <button className='btn btn-icon task-player-icon-btn' onClick={onPauseTask} title="Pause task">
            <FaPause />
          </button>
        )}

        {!task.isTaskBreak && (
          <button className='btn btn-icon task-player-icon-btn' onClick={handleNextTask} title="Next task">
            <MdSkipNext />
          </button>
        )}

        <button className="btn btn-primary task-player-done-btn" onClick={onDoneTask}>
          Done
        </button>
      </div>
    </div>
  );
};

export default TaskPlayer;
