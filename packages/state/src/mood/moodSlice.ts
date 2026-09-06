import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MoodEntry } from '@beyou/types/mood/mood';

/**
 * The mood entries the app currently has loaded, indexed by day.
 *
 * A map and not a list, because both readers ask the same question — "what is on this date" —
 * and because the widget's week and the page's month overlap. Two lists would have shown a day
 * marked on the dashboard and blank on the page until one of them refetched.
 *
 * NOTE: this slice holds journal text, which makes it the most personal thing in the store. It
 * is on the web persist blacklist and mobile redux is in-memory, so it never reaches disk on
 * either platform. `apps/web/src/redux/store.test.ts` locks that down.
 */
const initialState: { byDate: Record<string, MoodEntry> } = {
    byDate: {},
};

const moodSlice = createSlice({
    name: 'mood',
    initialState,
    reducers: {
        /** Merges a fetched range in, leaving days outside it alone. */
        enterMoodEntries(state, action: PayloadAction<MoodEntry[]>) {
            const byDate = { ...state.byDate };
            for (const entry of action.payload) byDate[entry.date] = entry;
            return { byDate };
        },
        /** One day, after a write. */
        upsertMoodEntry(state, action: PayloadAction<MoodEntry>) {
            return { byDate: { ...state.byDate, [action.payload.date]: action.payload } };
        },
        removeMoodEntry(state, action: PayloadAction<string>) {
            const byDate = { ...state.byDate };
            delete byDate[action.payload];
            return { byDate };
        },
        /**
         * Drops everything held. For a refetch that must not leave a deleted day behind, and for
         * the moment an account logs out on web, where the store survives the navigation.
         */
        clearMoodEntries() {
            return { byDate: {} };
        },
    },
});

export const { enterMoodEntries, upsertMoodEntry, removeMoodEntry, clearMoodEntries } =
    moodSlice.actions;
export default moodSlice.reducer;
