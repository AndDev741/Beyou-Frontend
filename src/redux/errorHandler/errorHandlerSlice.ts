import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    defaultError: ""
}

const errorHandlerSlice = createSlice({
    name: 'errorHandler',
    initialState,
    reducers: {
        defaultErrorEnter(state, action){
            const defaultError = action.payload;
            return {...state, defaultError}
        }
    }
})

export const {defaultErrorEnter} = errorHandlerSlice.actions;
export default errorHandlerSlice.reducer;