import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer, { logout } from './auth/authSlice';
import perfil from '@beyou/state/user/perfilSlice';
import todayRoutine from '@beyou/state/routine/todayRoutineSlice';
import routines from '@beyou/state/routine/routinesSlice';
import editRoutine from '@beyou/state/routine/editRoutineSlice';
import snapshot from '@beyou/state/routine/snapshotSlice';
import habits from '@beyou/state/habit/habitsSlice';
import tasks from '@beyou/state/task/tasksSlice';
import goals from '@beyou/state/goal/goalsSlice';
import categories from '@beyou/state/category/categoriesSlice';
import celebration from '@beyou/state/celebration/celebrationSlice';
import viewFilters from '@beyou/state/viewFilters/viewFiltersSlice';
import tutorial from './tutorial/tutorialSlice';

// Factory so tests can spin up an isolated store per test (Redux state is not
// reset between Jest cases). App code uses the singleton `store` below.
// `auth` is mobile-specific (native token auth); the rest are the shared
// @beyou/state slices the dashboard reads/writes — same reducer keys as the
// web rootReducer so shared actions/selectors line up. Mobile redux is
// in-memory only (tokens live in secureStore; dashboard data refetches on mount).
const combinedReducer = combineReducers({
  auth: authReducer,
  perfil,
  todayRoutine,
  routines,
  editRoutine,
  snapshot,
  habits,
  tasks,
  goals,
  categories,
  celebration,
  viewFilters,
  tutorial,
});

// On logout, reset EVERY slice to its initial state. Mobile redux is in-memory
// and the app never reloads on logout (unlike web, which reloads + purges), so
// without this the next account inherits the previous user's data — profile
// photo, today's routine, habits, etc. Passing `undefined` makes each reducer
// re-init. auth handles logout.fulfilled itself; re-init lands it identically.
const rootReducer: typeof combinedReducer = (state, action) =>
  combinedReducer(action.type === logout.fulfilled.type ? undefined : state, action);

export const makeStore = () => configureStore({ reducer: rootReducer });

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
