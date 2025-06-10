import { createSlice } from "@reduxjs/toolkit";
import { Routine } from "../../types/routine/routine";

const initialState: {
    routine: Routine | null;
} = {
    routine: null,
};

const routinesSlice = createSlice({
    name: 'todayRoutine',
    initialState,
    reducers: {
        enterTodayRoutine(state, action) {
            const routine = action.payload;
            return { ...state, routine };
        }
    }

});

export const { enterTodayRoutine } = routinesSlice.actions;

export default routinesSlice.reducer;