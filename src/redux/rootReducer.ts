import { combineReducers } from "@reduxjs/toolkit";
import registerSlice from "./authentication/registerSlice";
import perfilSlice from './dashboard/perfilSlice';
import editCategorySlice from './category/editCategorySlice';
import editHabitSlice from './habit/editHabitSlice';
import errorHandlerSlice from './errorHandler/errorHandlerSlice';
import editTaskSlice from "./task/editTaskSlice";

const rootReducer = combineReducers({
    register: registerSlice,
    perfil: perfilSlice,
    editCategory: editCategorySlice,
    editHabit: editHabitSlice,
    editTask: editTaskSlice,
    errorHandler: errorHandlerSlice
});

export type RootState = ReturnType<typeof rootReducer>
export default rootReducer;