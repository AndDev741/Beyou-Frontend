import { combineReducers } from "@reduxjs/toolkit";
import registerSlice from "./authentication/registerSlice";
import perfilSlice from './dashboard/perfilSlice';

const rootReducer = combineReducers({
    register: registerSlice,
    perfil: perfilSlice
});

export default rootReducer;