import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "~/ui/store/hooks";
import { insertNewTaskAtCurrentPosition, setTodoStatus, removeTask, updateTask, addSubTask } from "~/ui/store/todo/todoSlice";
import { TodoStatus } from "~/enums/TodoStatus.Type.enum";
import { generateId } from "~/ui/helpers/utils/utils";

const InputHandler = () => {
    const dispatch = useAppDispatch();
    const todoFlow = useAppSelector((state) => state.todoflow);
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
            
            if (location.pathname !== '/todoflow') return;
            
            if (cmdOrCtrl && event.key === 'n' && !event.shiftKey) {
                event.preventDefault();
                const lastIndex = todoFlow.taskIds.length - 1;
                dispatch(insertNewTaskAtCurrentPosition({ index: lastIndex, isDown: true }));
            }
            
            if (cmdOrCtrl && event.shiftKey && event.key === 'N') {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement && activeElement.classList.contains('task-input')) {
                    event.preventDefault();
                    const classes = Array.from(activeElement.classList);
                    const inputClass = classes.find(cls => cls.startsWith('input-'));
                    if (inputClass) {
                        const taskId = inputClass.replace('input-', '');
                        const task = todoFlow.tasks[taskId];
                        if (task) {
                            dispatch(addSubTask({ taskId, subTask: { id: `${generateId()}`, title: '', completed: false } }));
                        }
                    }
                }
            }
            
            if (cmdOrCtrl && event.shiftKey && event.key === 'F') {
                event.preventDefault();
                if (todoFlow.timer != null) {
                    dispatch(setTodoStatus(TodoStatus.START_ON_PROGRESS));
                }
            }
            
            if (cmdOrCtrl && event.key === ',') {
                event.preventDefault();
                navigate('/setting');
            }
            
            if (cmdOrCtrl && event.key === 'd' && !event.shiftKey) {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement && activeElement.classList.contains('task-input')) {
                    event.preventDefault();
                    const classes = Array.from(activeElement.classList);
                    const inputClass = classes.find(cls => cls.startsWith('input-'));
                    if (inputClass) {
                        const taskId = inputClass.replace('input-', '');
                        if (taskId && todoFlow.tasks[taskId]) {
                            dispatch(removeTask(taskId));
                        }
                    }
                }
                else if (todoFlow.taskIds.length > 0) {
                    event.preventDefault();
                    const lastIndex = todoFlow.taskIds.length - 1;
                    const taskId = todoFlow.taskIds[lastIndex];
                    dispatch(removeTask(taskId));
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [dispatch, todoFlow.timer, todoFlow.taskIds.length, navigate, location.pathname]);
    
    return null;
};

export default InputHandler;
