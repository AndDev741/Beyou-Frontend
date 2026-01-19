import { createSlice } from '@reduxjs/toolkit';
import category from '../../types/category/categoryType';

const initialState: { categories: category[] } = {
  categories: [],
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    enterCategories(state, action) {
      const categories = action.payload;
      return { ...state, categories };
    },
    updateCategorie(state, action) {
      return {
        ...state,
        categories: state.categories.map(g => g.id === action.payload.id ? action.payload : g)
      };
    }
  },
});

export const { enterCategories, updateCategorie } = categoriesSlice.actions;
export default categoriesSlice.reducer;