import { combineReducers } from "@reduxjs/toolkit";
import registerSlice from "./authentication/registerSlice";
import perfilSlice from './dashboard/perfilSlice';
import editCategorySlice from './category/editCategorySlice';
import editHabitSlice from './habit/editHabitSlice';
import errorHandlerSlice from './errorHandler/errorHandlerSlice';

const rootReducer = combineReducers({
    register: registerSlice,
    perfil: perfilSlice,
    editCategory: editCategorySlice,
    editHabit: editHabitSlice,
    errorHandler: errorHandlerSlice
});

export type RootState = ReturnType<typeof rootReducer>
export default rootReducer;