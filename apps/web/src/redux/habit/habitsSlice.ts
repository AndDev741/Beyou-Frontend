import { createSlice } from "@reduxjs/toolkit";
import { habit } from "../../types/habit/habitType";

const initialState: {
    habits: habit[];
} = {
    habits: [],
};

const habitsSlice = createSlice({
    name: 'habits',
    initialState,
    reducers: {
        enterHabits(state, action) {
            const habits = action.payload;
            return { ...state, habits };
        }
    }

});

export const { enterHabits } = habitsSlice.actions;

export default habitsSlice.reducer;