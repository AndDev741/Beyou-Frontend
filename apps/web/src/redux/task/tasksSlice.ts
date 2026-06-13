import { createSlice } from "@reduxjs/toolkit";
import { task } from "../../types/tasks/taskType";

const initialState: {
    tasks: task[];
} = {
    tasks: [],
};

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        enterTasks(state, action) {
            const tasks = action.payload;
            return { ...state, tasks };
        }
    }

});

export const { enterTasks } = tasksSlice.actions;

export default tasksSlice.reducer;