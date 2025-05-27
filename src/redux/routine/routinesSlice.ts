import { createSlice } from "@reduxjs/toolkit";
import { Routine } from "../../types/routine/routine";

const initialState: {
    routines: Routine[];
} = {
    routines: [],
};

const routinesSlice = createSlice({
    name: 'routines',
    initialState,
    reducers: {
        enterRoutines(state, action) {
            const routines = action.payload;
            return { ...state, routines };
        }
    }

});

export const { enterRoutines } = routinesSlice.actions;

export default routinesSlice.reducer;