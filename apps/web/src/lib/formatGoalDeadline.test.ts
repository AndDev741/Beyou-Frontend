import { describe, expect, it } from "vitest";
import { formatGoalDeadline } from "@beyou/state";

const now = new Date("2026-08-08T12:00:00");

describe("formatGoalDeadline", () => {
    it("leaves the current year out — repeating it in every goal is noise", () => {
        expect(formatGoalDeadline("2026-07-24", "en-US", "dayMonth", now)).toBe("Jul 24");
    });

    it("puts the year in when it is not the current one", () => {
        // "by Jul 24" on a 2027 goal reads as July of this year.
        expect(formatGoalDeadline("2027-07-24", "en-US", "dayMonth", now)).toBe("Jul 24 - 2027");
    });

    it("carries the year on a past year too", () => {
        expect(formatGoalDeadline("2025-12-31", "en-US", "dayMonth", now)).toBe("Dec 31 - 2025");
    });

    it("honours each shape", () => {
        expect(formatGoalDeadline("2026-08-08", "en-US", "weekday", now)).toBe("Sat");
        expect(formatGoalDeadline("2026-08-08", "en-US", "month", now)).toBe("Aug");
        expect(formatGoalDeadline("2027-08-08", "en-US", "month", now)).toBe("Aug - 2027");
    });

    it("takes a Date as well as a string", () => {
        expect(formatGoalDeadline(new Date("2027-01-05"), "en-US", "dayMonth", now)).toBe("Jan 5 - 2027");
    });

    it("says nothing when there is no usable date", () => {
        expect(formatGoalDeadline(undefined, "en-US", "dayMonth", now)).toBe("");
        expect(formatGoalDeadline("not a date", "en-US", "dayMonth", now)).toBe("");
    });
});
