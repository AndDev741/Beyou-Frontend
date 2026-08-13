import { describe, expect, it } from "vitest";
import { addDaysIso, daysBetweenIso, isIsoDay, todayInZone, weekdayIndexIso } from "./isoDay";

describe("todayInZone", () => {
    it("resolves the day in the named zone, not the machine's", () => {
        // 2026-08-14T01:30Z is still the 13th in São Paulo and already the 14th in Tokyo.
        const instant = new Date("2026-08-14T01:30:00Z");
        expect(todayInZone("America/Sao_Paulo", instant)).toBe("2026-08-13");
        expect(todayInZone("Asia/Tokyo", instant)).toBe("2026-08-14");
        expect(todayInZone("UTC", instant)).toBe("2026-08-14");
    });

    it("pads month and day to two digits", () => {
        expect(todayInZone("UTC", new Date("2026-01-05T10:00:00Z"))).toBe("2026-01-05");
    });

    it("falls back to the device zone instead of throwing on a bad zone string", () => {
        const result = todayInZone("Not/AZone", new Date("2026-08-14T12:00:00Z"));
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("treats an absent zone as the device zone", () => {
        expect(todayInZone(null, new Date("2026-08-14T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe("addDaysIso", () => {
    it("moves forward and back across month ends", () => {
        expect(addDaysIso("2026-08-31", 1)).toBe("2026-09-01");
        expect(addDaysIso("2026-09-01", -1)).toBe("2026-08-31");
    });

    it("crosses a year", () => {
        expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    });

    it("keeps the calendar day across a DST transition", () => {
        // Brazil has dropped DST, but the US has not: the anchor must not slip a day
        // in either direction around a shift.
        expect(addDaysIso("2026-03-08", -1)).toBe("2026-03-07");
        expect(addDaysIso("2026-11-01", 1)).toBe("2026-11-02");
    });

    it("counts a leap day", () => {
        expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
    });
});

describe("weekdayIndexIso", () => {
    it("is Sunday-first, like the app's day pills", () => {
        expect(weekdayIndexIso("2026-08-09")).toBe(0); // Sunday
        expect(weekdayIndexIso("2026-08-13")).toBe(4); // Thursday
        expect(weekdayIndexIso("2026-08-15")).toBe(6); // Saturday
    });
});

describe("daysBetweenIso / isIsoDay", () => {
    it("counts whole days in both directions", () => {
        expect(daysBetweenIso("2026-08-01", "2026-08-14")).toBe(13);
        expect(daysBetweenIso("2026-08-14", "2026-08-01")).toBe(-13);
    });

    it("recognises a date-only string and nothing else", () => {
        expect(isIsoDay("2026-08-14")).toBe(true);
        expect(isIsoDay("2026-08-14T10:00:00")).toBe(false);
        expect(isIsoDay(undefined)).toBe(false);
    });
});
