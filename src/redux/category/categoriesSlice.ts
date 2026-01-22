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
    },
    refreshCategorie(state, action) {
      return {
        ...state,
        categories: state.categories.map(g => {
          if (g.id === action.payload.id) {
            return {
              ...g,
              xp: action.payload.xp,
              level: action.payload.level,
              actualLevelXp: action.payload.actualLevelXp,
              nextLevelXp: action.payload.nextLevelXp
            };
          }
          return g;
        })
      };
    }
  },
});

export const { enterCategories, updateCategorie, refreshCategorie } = categoriesSlice.actions;
export default categoriesSlice.reducer;