import { configureStore } from '@reduxjs/toolkit';
import todoflowReducer from './todo/todoSlice';

export const store = configureStore({
  reducer: {
    todoflow: todoflowReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
