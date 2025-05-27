import { createSlice } from "@reduxjs/toolkit";
import { Routine } from "../../types/routine/routine";

type initialStateType = {
    editMode: boolean,
    routine: Routine
}

const initialState: initialStateType = {
    editMode: false,
    routine: {} as Routine
}

const editRoutineSlice = createSlice({
    name: 'editRoutine',
    initialState,
    reducers: {
        editModeEnter(state, action){
            const editMode = action.payload;
            return {...state, editMode};
        },
        routineEnter(state, action){
            const routine = action.payload;
            return {...state, routine};
        },
    }
});

export const {editModeEnter ,routineEnter} = editRoutineSlice.actions;

export default editRoutineSlice.reducer;