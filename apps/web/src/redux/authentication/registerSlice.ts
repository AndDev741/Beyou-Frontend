import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    successRegister: false
}

const registerSlice = createSlice({
    name: 'register',
    initialState,
    reducers: {
        successRegisterEnter(state, action){
            const successRegister = action.payload;
            return {...state, successRegister}
        }
    }
})

export const {successRegisterEnter} = registerSlice.actions;

export default registerSlice.reducer;