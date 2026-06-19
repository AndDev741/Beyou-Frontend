import { describe, expect, it } from "vitest";
import { getGreetingKey, calculateLevelProgress } from "../helpers";

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
