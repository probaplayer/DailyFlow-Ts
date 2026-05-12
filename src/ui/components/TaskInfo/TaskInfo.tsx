import { MdDeleteForever } from "react-icons/md";

import { formatTime } from "~/ui/helpers/utils/utils";

interface TaskInfoProps {
  task: Task;
  className?: string;
  onDeleted?: () => void;
}

const TaskInfo = ({ task, className, onDeleted }: TaskInfoProps) => {
  if (!task) return null;

  const { title, estimatedTime } = task;

  const handleDeleteTask = async () => {
    await window.electronAPI.taskRemove(task.id);
    onDeleted?.();
  }

  return (
    <div className={`card mt-3 ${className} relative`}>
      <span>Title: </span> <span className="text-highlight">{title}</span>
      <div className="flex justify-between text-sm mt-1">
        <p>Estimated time:</p>
        <p>{formatTime(estimatedTime)}</p>
      </div>
      <div className="absolute top-2 right-2 flex">
        <button className="btn btn-icon" onClick={handleDeleteTask}>
          <MdDeleteForever />
        </button>
      </div>    
    </div>
  );
};

export default TaskInfo;
