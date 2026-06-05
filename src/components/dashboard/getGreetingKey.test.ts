import { describe, expect, it } from "vitest";
import { getGreetingKey } from "./getGreetingKey";

describe("getGreetingKey", () => {
    it("returns GoodMorning from 5:00 to 11:59", () => {
        expect(getGreetingKey(5)).toBe("GoodMorning");
        expect(getGreetingKey(11)).toBe("GoodMorning");
    });
    it("returns GoodAfternoon from 12:00 to 16:59", () => {
        expect(getGreetingKey(12)).toBe("GoodAfternoon");
        expect(getGreetingKey(16)).toBe("GoodAfternoon");
    });
    it("returns GoodEvening from 17:00 to 20:59", () => {
        expect(getGreetingKey(17)).toBe("GoodEvening");
        expect(getGreetingKey(20)).toBe("GoodEvening");
    });
    it("returns GoodNight from 21:00 to 4:59", () => {
        expect(getGreetingKey(21)).toBe("GoodNight");
        expect(getGreetingKey(23)).toBe("GoodNight");
        expect(getGreetingKey(0)).toBe("GoodNight");
        expect(getGreetingKey(4)).toBe("GoodNight");
    });
});
