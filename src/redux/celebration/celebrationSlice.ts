import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Celebration =
    | { kind: "levelUp"; level: number }
    | { kind: "streakMilestone"; days: number };

type celebrationState = {
    queue: Celebration[];
};

const initialState: celebrationState = {
    queue: []
};

const celebrationSlice = createSlice({
    name: "celebration",
    initialState,
    reducers: {
        celebrationPushed(state, action: PayloadAction<Celebration>) {
            return { ...state, queue: [...state.queue, action.payload] };
        },
        celebrationShifted(state) {
            return { ...state, queue: state.queue.slice(1) };
        }
    }
});

export const { celebrationPushed, celebrationShifted } = celebrationSlice.actions;
export default celebrationSlice.reducer;
