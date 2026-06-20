import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import perfil from '@beyou/state/user/perfilSlice';
import todayRoutine from '@beyou/state/routine/todayRoutineSlice';
import habits from '@beyou/state/habit/habitsSlice';
import tasks from '@beyou/state/task/tasksSlice';
import goals from '@beyou/state/goal/goalsSlice';
import categories from '@beyou/state/category/categoriesSlice';
import celebration from '@beyou/state/celebration/celebrationSlice';

// Factory so tests can spin up an isolated store per test (Redux state is not
// reset between Jest cases). App code uses the singleton `store` below.
// `auth` is mobile-specific (native token auth); the rest are the shared
// @beyou/state slices the dashboard reads/writes — same reducer keys as the
// web rootReducer so shared actions/selectors line up. Mobile redux is
// in-memory only (tokens live in secureStore; dashboard data refetches on mount).
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      perfil,
      todayRoutine,
      habits,
      tasks,
      goals,
      categories,
      celebration,
    },
  });

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
