import { calculateProgressWidth, formatTime } from "~/ui/helpers/utils/utils";
import { MdDeleteForever } from "react-icons/md";
import { getTodoScheduleDateKeys } from "~/ui/helpers/utils/scheduleUtils";

interface TodoInfoProps {
  todo: TodoFlow;
  className?: string;
  onMakeTodo: (todo: TodoFlow) => void;
  onDeleted?: () => void;
}

const TodoInfo = ({ todo, onMakeTodo, className, onDeleted }: TodoInfoProps) => {
  const { note, taskCompleted, taskTotal, actualTimeTodo, estimatedTimeTodo } = todo;
  const assignedDateKeys = getTodoScheduleDateKeys(todo);
  const slotLabels = (todo.scheduleSlots || []).map(
    (slot) => `${slot.dateKey} ${slot.startTime}-${slot.endTime}`
  );

  const handleToDelete = async () => {
    await window.electronAPI.todoRemove(todo.id);
    onDeleted?.();
  }
  
  return (
    <div className={`card mt-3 ${className} relative`}>
      <span>Note: </span> <span className="text-highlight">{note}</span>
      <div className="progress progress-xl">
          <div className="progress-bar" style={{ width: calculateProgressWidth(taskCompleted, taskTotal) }}></div>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <p>progress:</p>
        <p>{`${taskCompleted}/${taskTotal}`}</p>
      </div>
      <div className='flex justify-between text-sm mt-1'>
        <p>Actual time spent:</p>
        <p>{formatTime(actualTimeTodo)}</p>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <p>Estimated time todo:</p>
        <p>{formatTime(estimatedTimeTodo)}</p>
      </div>
      {assignedDateKeys.length > 0 && (
        <div className="flex justify-between text-sm mt-1 gap-2">
          <p>Assigned:</p>
          <p className="text-right">{slotLabels.length > 0 ? slotLabels.join(', ') : assignedDateKeys.join(', ')}</p>
        </div>
      )}
      <button className="btn btn-primary btn-sm w-full mt-3" onClick={() => onMakeTodo(todo)}>Make it my Todo for today!</button>
      <button className="btn btn-icon absolute top-2 right-2"
        onClick={handleToDelete}
      >
        <MdDeleteForever /> 
      </button>
    </div>
  );
};

export default TodoInfo;
