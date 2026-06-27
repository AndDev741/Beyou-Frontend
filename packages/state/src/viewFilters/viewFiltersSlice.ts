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
        },
        // Merge persisted prefs on boot (mobile). Only known keys with string
        // values are applied — never trust the stored blob blindly.
        hydrateViewFilters(state, action) {
            const saved = action.payload as Partial<ViewFiltersState> | null | undefined;
            if (!saved || typeof saved !== "object") return;
            (Object.keys(initialState) as ViewSortKey[]).forEach((key) => {
                const value = saved[key];
                if (typeof value === "string") state[key] = value;
            });
        }
    }
});

export const { setViewSort, hydrateViewFilters } = viewFiltersSlice.actions;
export default viewFiltersSlice.reducer;
