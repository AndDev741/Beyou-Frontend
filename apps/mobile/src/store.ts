import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';

// Factory so tests can spin up an isolated store per test (Redux state is not
// reset between Jest cases). App code uses the singleton `store` below.
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
