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
            console.log("ACTION RECEIVED => ", action)
            const routine = action.payload;
            console.log("ROUTINE NOW => ", routine)

            return {...state, routine};
        },
    }
});

export const {editModeEnter ,routineEnter} = editRoutineSlice.actions;

export default editRoutineSlice.reducer;