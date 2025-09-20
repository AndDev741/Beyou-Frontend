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
    updateGoal(state, action) {
      return {
        ...state,
        goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g)
      };
    }
  },
});

export const { enterGoals, updateGoal } = goalsSlice.actions;
export default goalsSlice.reducer;