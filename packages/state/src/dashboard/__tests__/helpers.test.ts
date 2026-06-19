import { describe, expect, it } from "vitest";
import {
  getGreetingKey,
  calculateLevelProgress,
  calculateDailyProgress,
  calculateRoutineXpToday,
} from "../helpers";

const TODAY = "2026-06-19";

// Minimal routine: 1 habit (checked today, 50 xp) + 1 task (unchecked).
const routine = {
  id: "r1",
  name: "R",
  iconId: "",
  routineSections: [
    {
      id: "s1",
      name: "S",
      iconId: "",
      startTime: "06:00",
      endTime: "07:00",
      order: 0,
      habitGroup: [
        {
          id: "hg1",
          habitId: "h1",
          startTime: "06:00",
          habitGroupChecks: [
            { id: "k1", checkDate: TODAY, checkTime: "06:05", checked: true, skipped: false, xpGenerated: 50 },
          ],
        },
      ],
      taskGroup: [{ id: "tg1", taskId: "t1", startTime: "06:30", taskGroupChecks: [] }],
    },
  ],
} as never;

describe("getGreetingKey", () => {
  it("returns GoodMorning between 05:00 and 11:59", () => {
    expect(getGreetingKey(5)).toBe("GoodMorning");
    expect(getGreetingKey(11)).toBe("GoodMorning");
  });
  it("returns GoodAfternoon between 12:00 and 16:59", () => {
    expect(getGreetingKey(12)).toBe("GoodAfternoon");
    expect(getGreetingKey(16)).toBe("GoodAfternoon");
  });
  it("returns GoodEvening between 17:00 and 20:59", () => {
    expect(getGreetingKey(17)).toBe("GoodEvening");
    expect(getGreetingKey(20)).toBe("GoodEvening");
  });
  it("returns GoodNight between 21:00 and 04:59", () => {
    expect(getGreetingKey(21)).toBe("GoodNight");
    expect(getGreetingKey(0)).toBe("GoodNight");
    expect(getGreetingKey(4)).toBe("GoodNight");
  });
});

describe("calculateLevelProgress", () => {
  it("computes the percentage within the level window", () => {
    expect(calculateLevelProgress(100, 80, 120)).toBe(50);
  });
  it("clamps to 0 below the window and 100 at/above the top", () => {
    expect(calculateLevelProgress(70, 80, 120)).toBe(0);
    expect(calculateLevelProgress(130, 80, 120)).toBe(100);
  });
  it("returns 0 for a zero or negative window", () => {
    expect(calculateLevelProgress(100, 80, 80)).toBe(0);
    expect(calculateLevelProgress(100, 120, 80)).toBe(0);
  });
});

describe("calculateDailyProgress", () => {
  it("counts today's checked items vs total (skipped/other days excluded)", () => {
    expect(calculateDailyProgress(routine, TODAY)).toEqual({ checked: 1, total: 2 });
  });
  it("counts nothing for a different day", () => {
    expect(calculateDailyProgress(routine, "2020-01-01")).toEqual({ checked: 0, total: 2 });
  });
  it("returns zeros for a null routine", () => {
    expect(calculateDailyProgress(null, TODAY)).toEqual({ checked: 0, total: 0 });
  });
});

describe("calculateRoutineXpToday", () => {
  it("sums xpGenerated of today's checked items", () => {
    expect(calculateRoutineXpToday(routine, TODAY)).toBe(50);
  });
  it("is 0 for another day or null routine", () => {
    expect(calculateRoutineXpToday(routine, "2020-01-01")).toBe(0);
    expect(calculateRoutineXpToday(null, TODAY)).toBe(0);
  });
});
