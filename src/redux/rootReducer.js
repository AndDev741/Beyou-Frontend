import { combineReducers } from "@reduxjs/toolkit";
import registerSlice from "./authentication/registerSlice";


const rootReducer = combineReducers({
    register: registerSlice
});

export default rootReducer;