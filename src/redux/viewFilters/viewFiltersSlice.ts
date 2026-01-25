import { createSlice } from "@reduxjs/toolkit";

export type ViewSortKey = "categories" | "goals" | "habits" | "routines" | "tasks";

type ViewFiltersState = Record<ViewSortKey, string>;

const initialState: ViewFiltersState = {
    categories: "default",
    goals: "default",
    habits: "default",
    routines: "default",
    tasks: "default"
};

const viewFiltersSlice = createSlice({
    name: "viewFilters",
    initialState,
    reducers: {
        setViewSort(state, action) {
            const { view, sortBy } = action.payload as { view: ViewSortKey; sortBy: string };
            state[view] = sortBy;
        }
    }
});

export const { setViewSort } = viewFiltersSlice.actions;
export default viewFiltersSlice.reducer;
