import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StudyCycle, StudyCycleSummary, StudyToday } from '@beyou/types/notebook/studyCycle';

/**
 * What the app has loaded of the study cycles: today's slice (the notebook home's card, the
 * dashboard widget), the list of active cycles, and each cycle opened in full.
 *
 * Server data read on demand, like the notebook: on the web persist blacklist, and mobile redux
 * is in-memory, so none of it reaches disk and the persisted shape does not change.
 */
export type StudyCyclesState = {
    today: StudyToday | null;
    list: StudyCycleSummary[];
    byId: Record<string, StudyCycle>;
};

const initialState: StudyCyclesState = { today: null, list: [], byId: {} };

const studyCycleSlice = createSlice({
    name: 'studyCycles',
    initialState,
    reducers: {
        enterStudyToday(state, action: PayloadAction<StudyToday>) {
            return { ...state, today: action.payload };
        },
        enterStudyCycles(state, action: PayloadAction<StudyCycleSummary[]>) {
            return { ...state, list: action.payload };
        },
        enterStudyCycle(state, action: PayloadAction<StudyCycle>) {
            return { ...state, byId: { ...state.byId, [action.payload.id]: action.payload } };
        },
        /** An archived or deleted cycle leaves every place that held it. */
        removeStudyCycle(state, action: PayloadAction<string>) {
            const byId = { ...state.byId };
            delete byId[action.payload];
            return { ...state, byId, list: state.list.filter((cycle) => cycle.id !== action.payload) };
        },
        clearStudyCycles() {
            return initialState;
        },
    },
});

export const { enterStudyToday, enterStudyCycles, enterStudyCycle, removeStudyCycle, clearStudyCycles } =
    studyCycleSlice.actions;

export default studyCycleSlice.reducer;
