import { createSlice } from '@reduxjs/toolkit';
import { goal } from '../../types/goals/goalType';

const initialState: { goals: goal[] } = {
  goals: [],
};

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    enterGoals(state, action) {
      const goals = action.payload;
      return { ...state, goals };
    },
  },
});

export const { enterGoals } = goalsSlice.actions;
export default goalsSlice.reducer;