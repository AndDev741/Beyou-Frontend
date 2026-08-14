import { describe, expect, it } from "vitest";
import reducer, { enterHabits, refreshHabit } from "../habitsSlice";
import type { habit } from "@beyou/types/habit/habitType";

const base = {
    id: "h1",
    name: "Read",
    description: "",
    motivationalPhrase: "",
    iconId: "lucide:book",
    categories: [],
    routines: {},
    importance: 3,
    dificulty: 2,
    xp: 30,
    level: 1,
    nextLevelXp: 100,
    actualLevelXp: 0,
    currentStreak: 4,
    bestStreak: 9,
    totalCheckIns: 32,
    firstCheckInDate: "2026-06-12",
    streakDormant: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
} as habit;

const withHabits = (...habits: habit[]) => reducer(undefined, enterHabits(habits));

describe("habitsSlice.refreshHabit", () => {
    it("applies the post-check scalars so the card repaints without a refetch", () => {
        const state = reducer(
            withHabits(base),
            refreshHabit({
                id: "h1",
                xp: 45,
                level: 2,
                actualLevelXp: 40,
                nextLevelXp: 120,
                currentStreak: 5,
                bestStreak: 9,
                totalCheckIns: 33,
            }),
        );

        expect(state.habits[0]).toMatchObject({
            xp: 45,
            level: 2,
            currentStreak: 5,
            totalCheckIns: 33,
        });
    });

    it("keeps what it had when a scalar is absent, instead of blanking the streak", () => {
        // Categories report zeros through the same DTO, and an older cached response
        // carries no check scalars at all.
        const state = reducer(
            withHabits(base),
            refreshHabit({ id: "h1", xp: 45, level: 1, actualLevelXp: 0, nextLevelXp: 100 }),
        );

        expect(state.habits[0].currentStreak).toBe(4);
        expect(state.habits[0].bestStreak).toBe(9);
        expect(state.habits[0].totalCheckIns).toBe(32);
    });

    it("wakes a dormant run that just got fed", () => {
        const state = reducer(
            withHabits({ ...base, streakDormant: true }),
            refreshHabit({ id: "h1", xp: 45, level: 1, actualLevelXp: 0, nextLevelXp: 100, currentStreak: 5, bestStreak: 9, totalCheckIns: 33 }),
        );
        expect(state.habits[0].streakDormant).toBe(false);
    });

    it("keeps a dormant run paused when the response came from an UNCHECK", () => {
        // Every branch sends recomputed scalars, so "the streak came back" is not the
        // same as "a day was just done". A falling lifetime tally is an uncheck.
        const state = reducer(
            withHabits({ ...base, streakDormant: true }),
            refreshHabit({ id: "h1", xp: 20, level: 1, actualLevelXp: 0, nextLevelXp: 100, currentStreak: 4, bestStreak: 9, totalCheckIns: 31 }),
        );
        expect(state.habits[0].streakDormant).toBe(true);
    });

    it("leaves the first check-in date to the next GET rather than guessing today", () => {
        const state = reducer(
            withHabits({ ...base, firstCheckInDate: null }),
            refreshHabit({ id: "h1", xp: 5, level: 1, actualLevelXp: 0, nextLevelXp: 100, currentStreak: 1, bestStreak: 1, totalCheckIns: 1 }),
        );
        expect(state.habits[0].firstCheckInDate).toBeNull();
    });

    it("touches only the habit named in the payload", () => {
        const other = { ...base, id: "h2", currentStreak: 1 };
        const state = reducer(
            withHabits(base, other),
            refreshHabit({ id: "h1", xp: 45, level: 1, actualLevelXp: 0, nextLevelXp: 100, currentStreak: 5, bestStreak: 9, totalCheckIns: 33 }),
        );
        expect(state.habits[1].currentStreak).toBe(1);
    });

    it("ignores a payload with no id", () => {
        const state = withHabits(base);
        expect(reducer(state, refreshHabit({}))).toBe(state);
    });
});
