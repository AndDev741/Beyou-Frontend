import { createSlice } from "@reduxjs/toolkit";

function saveState(state){
    try{
        const serializedState = JSON.stringify(state);
        sessionStorage.setItem('redux-user-state', serializedState);
    }catch(err){
        console.error(err);
    }
}

function loadState(){
    try{
        const serializedState = sessionStorage.getItem('redux-user-state');
        if(serializedState === null){
            return undefined;
        }
        return JSON.parse(serializedState);
    }catch(err){
        console.err(err);
    }
}

const initialState = loadState() || {
    successRegister: false
}

const registerSlice = createSlice({
    name: 'register',
    initialState,
    reducers: {
        successRegisterEnter(state, action){
            const successRegister = action.payload;
            saveState(state)
            return {...state, successRegister}
        }
    }
})

export const {successRegisterEnter} = registerSlice.actions;

export default registerSlice.reducer;