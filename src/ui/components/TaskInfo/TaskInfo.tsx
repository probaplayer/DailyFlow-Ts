import { FaCartArrowDown } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";

import { formatTime } from "~/ui/helpers/utils/utils";
import { useAppDispatch } from "~/ui/store/hooks";
import { addTaskInCart, removeTaskCart } from "~/ui/store/task/taskCartSlice";

interface TaskInfoProps {
  task: Task;
  className?: string;
}

const TaskInfo = ({ task, className }: TaskInfoProps) => {
  const dispatch = useAppDispatch();
  if (!task) return null;

  const { title, estimatedTime } = task;

  const handleDeleteTask = async () => {
    await window.electronAPI.taskRemove(task.id);
    dispatch(removeTaskCart(task.id));
  }

  return (
    <div className={`card mt-3 ${className} relative`}>
      <span>Title: </span> <span className="text-highlight">{title}</span>
      <div className="flex justify-between text-sm mt-1">
        <p>Estimated time:</p>
        <p>{formatTime(estimatedTime)}</p>
      </div>
      <div className="absolute top-2 right-2 flex">
        <button className="btn btn-icon "
          onClick={() => {dispatch(addTaskInCart(task.id))}}
        >
          <FaCartArrowDown /> 
        </button>
        <button className="btn btn-icon" onClick={handleDeleteTask}>
          <MdDeleteForever />
        </button>
      </div>    
    </div>
  );
};

export default TaskInfo;
