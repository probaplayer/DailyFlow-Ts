import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTodo } from '~/ui/store/todo/todoSlice';
import { useAppDispatch } from '~/ui/store/hooks';

const ScheduleEditorCompletionListener = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    return window.electronAPI.onScheduleEditorCompleted(({ todo, mode }) => {
      dispatch(setTodo(todo));
      navigate('/todoflow', { state: { mode } });
    });
  }, [dispatch, navigate]);

  return null;
};

export default ScheduleEditorCompletionListener;
