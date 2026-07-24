import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TutorialPhase =
  | 'intro' | 'ai' | 'dashboard' | 'categories' | 'habits' | 'routines' | 'config' | 'done';

interface TutorialState { phase: TutorialPhase | null }
const initialState: TutorialState = { phase: null };

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    setPhase(state, action: PayloadAction<TutorialPhase | null>) {
      state.phase = action.payload;
    },
    clearPhase(state) {
      state.phase = null;
    },
  },
});

export const { setPhase, clearPhase } = tutorialSlice.actions;
export default tutorialSlice.reducer;
