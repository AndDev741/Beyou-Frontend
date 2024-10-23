import { combineReducers } from "@reduxjs/toolkit";
import registerSlice from "./authentication/registerSlice";
import perfilSlice from './dashboard/perfilSlice';
import editCategorySlice from './category/editCategorySlice';

const rootReducer = combineReducers({
    register: registerSlice,
    perfil: perfilSlice,
    editCategory: editCategorySlice
});

export default rootReducer;