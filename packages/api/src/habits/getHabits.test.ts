import { describe, test, expect, vi, beforeEach } from "vitest";
import type { habit } from "@beyou/types/habit/habitType";
import { setHttpClient } from "../httpClient";
import getHabits from "./getHabits";

const t = ((key: string) => key) as never;

/** What a backend that predates the check scalars returns. */
const legacyHabit = {
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
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
};

describe("getHabits", () => {
    const get = vi.fn();

    beforeEach(() => {
        get.mockReset();
        setHttpClient({ get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
    });

    test("fills the check scalars when the response has none", async () => {
        // Otherwise the card renders the string "undefined dias".
        get.mockResolvedValue({ data: [legacyHabit] });

        const result = await getHabits(t);
        const [first] = result.success as habit[];

        expect(first.currentStreak).toBe(0);
        expect(first.bestStreak).toBe(0);
        expect(first.totalCheckIns).toBe(0);
        expect(first.firstCheckInDate).toBeNull();
        expect(first.streakDormant).toBe(false);
    });

    test("leaves real values alone", async () => {
        get.mockResolvedValue({
            data: [{
                ...legacyHabit,
                currentStreak: 5,
                bestStreak: 9,
                totalCheckIns: 32,
                firstCheckInDate: "2026-06-12",
                streakDormant: true,
            }],
        });

        const [first] = (await getHabits(t)).success as habit[];

        expect(first).toMatchObject({
            currentStreak: 5,
            bestStreak: 9,
            totalCheckIns: 32,
            firstCheckInDate: "2026-06-12",
            streakDormant: true,
        });
    });

    test("treats an explicit null the same as an absent field", async () => {
        get.mockResolvedValue({ data: [{ ...legacyHabit, currentStreak: null, bestStreak: null }] });

        const [first] = (await getHabits(t)).success as habit[];

        expect(first.currentStreak).toBe(0);
        expect(first.bestStreak).toBe(0);
    });

    test("returns a translated error instead of throwing", async () => {
        get.mockRejectedValue(new Error("boom"));

        const result = await getHabits(t);

        expect(result.error).toBe("UnexpectedError");
        expect(result.success).toBeUndefined();
    });
});
