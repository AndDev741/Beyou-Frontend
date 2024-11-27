import { combineReducers } from "@reduxjs/toolkit";
import registerSlice from "./authentication/registerSlice";
import perfilSlice from './dashboard/perfilSlice';
import editCategorySlice from './category/editCategorySlice';
import editHabitSlice from './habit/editHabitSlice';

const rootReducer = combineReducers({
    register: registerSlice,
    perfil: perfilSlice,
    editCategory: editCategorySlice,
    editHabit: editHabitSlice 
});

export default rootReducer;