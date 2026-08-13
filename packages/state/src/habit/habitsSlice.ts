import { createSlice } from "@reduxjs/toolkit";
import { habit } from "@beyou/types/habit/habitType";

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
        },
        /**
         * Applies the post-check numbers a `RefreshUI` carries for one habit, so the
         * card repaints from the check response instead of a second `GET /habit`.
         *
         * The three check scalars are optional on the wire (categories report zeros,
         * an older cached response has none), so an absent field keeps what the habit
         * already had. Overwriting with zero would blank a streak on every check.
         */
        refreshHabit(state, action) {
            const refresh = action.payload;
            if (!refresh?.id) return state;
            return {
                ...state,
                habits: state.habits.map((h) => {
                    if (h.id !== refresh.id) return h;
                    return {
                        ...h,
                        xp: refresh.xp ?? h.xp,
                        level: refresh.level ?? h.level,
                        actualLevelXp: refresh.actualLevelXp ?? h.actualLevelXp,
                        nextLevelXp: refresh.nextLevelXp ?? h.nextLevelXp,
                        currentStreak: refresh.currentStreak ?? h.currentStreak,
                        bestStreak: refresh.bestStreak ?? h.bestStreak,
                        totalCheckIns: refresh.totalCheckIns ?? h.totalCheckIns,
                        // `firstCheckInDate` is deliberately left alone: the response does
                        // not carry it, and guessing today would be wrong for every habit
                        // that already had one. It arrives on the next GET.
                        // A run that was paused is moving again.
                        streakDormant: refresh.currentStreak !== undefined ? false : h.streakDormant,
                    };
                }),
            };
        },
    }

});

export const { enterHabits, refreshHabit } = habitsSlice.actions;

export default habitsSlice.reducer;
