import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTodo } from '~/ui/store/todo/todoSlice';
import { useAppDispatch } from '~/ui/store/hooks';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import { getTodoScheduleDateKeys, toDateKey } from '~/ui/helpers/utils/scheduleUtils';

const ScheduleEditorCompletionListener = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { ask } = useAlert();

  useEffect(() => {
    return window.electronAPI.onScheduleEditorCompleted(async ({ todo, mode }) => {
      dispatch(setTodo(todo));
      if (!getTodoScheduleDateKeys(todo).includes(toDateKey(new Date()))) {
        navigate('/dashboard');
        return;
      }

      const result = await ask('This TodoFlow is scheduled for today. Do you want to start it now?', 'Start TodoFlow', [
        'Start',
        'Dashboard',
      ]);
      if (result.response === 0) {
        navigate('/todoflow', { state: { mode } });
        return;
      }

      navigate('/dashboard');
    });
  }, [ask, dispatch, navigate]);

  return null;
};

export default ScheduleEditorCompletionListener;
