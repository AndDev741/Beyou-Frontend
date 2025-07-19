import { createSlice } from '@reduxjs/toolkit';
import category from '../../types/category/categoryType';

const initialState: {
  editMode: boolean;
  goalId: string;
  title: string;
  iconId: string;
  description: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: category[];
  motivation: string;
  startDate: string;
  endDate: string;
  xpReward: number;
  status: string;
  term: string;
} = {
  editMode: false,
  goalId: '',
  title: '',
  iconId: '',
  description: '',
  targetValue: 0,
  unit: '',
  currentValue: 0,
  complete: false,
  categories: [],
  motivation: '',
  startDate: '',
  endDate: '',
  xpReward: 0,
  status: '',
  term: '',
};

const editGoalSlice = createSlice({
  name: 'editGoal',
  initialState,
  reducers: {
    editModeEnter(state, action) {
      const editMode = action.payload;
      return { ...state, editMode };
    },
    editGoalIdEnter(state, action) {
      const goalId = action.payload;
      return { ...state, goalId };
    },
    editTitleEnter(state, action) {
      const title = action.payload;
      return { ...state, title };
    },
    editIconIdEnter(state, action) {
      const iconId = action.payload;
      return { ...state, iconId };
    },
    editDescriptionEnter(state, action) {
      const description = action.payload;
      return { ...state, description };
    },
    editTargetValueEnter(state, action) {
      const targetValue = action.payload;
      return { ...state, targetValue };
    },
    editUnitEnter(state, action) {
      const unit = action.payload;
      return { ...state, unit };
    },
    editCurrentValueEnter(state, action) {
      const currentValue = action.payload;
      return { ...state, currentValue };
    },
    editCompleteEnter(state, action) {
      const complete = action.payload;
      return { ...state, complete };
    },
    editCategoryEnter(state, action) {
      const categories = action.payload;
      return { ...state, categories };
    },
    editMotivationEnter(state, action) {
      const motivation = action.payload;
      return { ...state, motivation };
    },
    editStartDateEnter(state, action) {
      const startDate = action.payload;
      return { ...state, startDate };
    },
    editEndDateEnter(state, action) {
      const endDate = action.payload;
      return { ...state, endDate };
    },
    editXpRewardEnter(state, action) {
      const xpReward = action.payload;
      return { ...state, xpReward };
    },
    editStatusEnter(state, action) {
      const status = action.payload;
      return { ...state, status };
    },
    editTermEnter(state, action) {
      const term = action.payload;
      return { ...state, term };
    },
  },
});

export const {
  editModeEnter,
  editGoalIdEnter,
  editTitleEnter,
  editDescriptionEnter,
  editTargetValueEnter,
  editUnitEnter,
  editIconIdEnter,
  editCurrentValueEnter,
  editCompleteEnter,
  editCategoryEnter,
  editMotivationEnter,
  editStartDateEnter,
  editEndDateEnter,
  editXpRewardEnter,
  editStatusEnter,
  editTermEnter,
} = editGoalSlice.actions;

export default editGoalSlice.reducer;