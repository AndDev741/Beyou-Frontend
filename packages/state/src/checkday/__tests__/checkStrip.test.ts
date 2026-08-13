import { describe, expect, it } from "vitest";
import type { CheckDay } from "@beyou/types/checkday/checkHistory";
import {
    checkDayLabelKey,
    checkDayTone,
    countDone,
    heatmapRange,
    stripRange,
    takeLastDays,
    weekAlignedCells,
} from "../checkStrip";

const day = (iso: string, outcome: CheckDay["outcome"]): CheckDay => ({ day: iso, outcome });

describe("checkDayTone", () => {
    it("gives done, skipped and missed a tone each", () => {
        expect(checkDayTone(day("2026-08-01", "DONE"))).toBe("done");
        expect(checkDayTone(day("2026-08-01", "SKIPPED"))).toBe("skipped");
        expect(checkDayTone(day("2026-08-01", "MISSED"))).toBe("missed");
    });

    it("collapses the three non-events into one grey", () => {
        expect(checkDayTone(day("2026-08-01", "NOT_SCHEDULED"))).toBe("idle");
        expect(checkDayTone(day("2026-08-01", "NOT_IN_ROUTINE"))).toBe("idle");
        expect(checkDayTone(day("2026-08-01", "UNKNOWN"))).toBe("idle");
    });

    it("reads today's missing record as open, not as a day with no record", () => {
        expect(checkDayTone(day("2026-08-13", "UNKNOWN"), "2026-08-13")).toBe("open");
        expect(checkDayLabelKey(day("2026-08-13", "UNKNOWN"), "2026-08-13")).toBe("OutcomeTodayOpen");
    });

    it("stops calling today open the moment it is checked", () => {
        expect(checkDayTone(day("2026-08-13", "DONE"), "2026-08-13")).toBe("done");
        expect(checkDayLabelKey(day("2026-08-13", "DONE"), "2026-08-13")).toBe("OutcomeDone");
    });

    it("keeps a label for every neutral outcome, so the tooltip can say which", () => {
        expect(checkDayLabelKey(day("2026-08-01", "NOT_SCHEDULED"))).toBe("OutcomeNotScheduled");
        expect(checkDayLabelKey(day("2026-08-01", "NOT_IN_ROUTINE"))).toBe("OutcomeNotInRoutine");
        expect(checkDayLabelKey(day("2026-08-01", "UNKNOWN"))).toBe("OutcomeUnknown");
    });
});

describe("stripRange", () => {
    it("ends today and counts back inclusively", () => {
        expect(stripRange(14, "2026-08-13")).toEqual({ from: "2026-07-31", to: "2026-08-13" });
    });

    it("crosses a month and a year boundary", () => {
        expect(stripRange(28, "2027-01-05")).toEqual({ from: "2026-12-09", to: "2027-01-05" });
    });
});

describe("heatmapRange", () => {
    it("starts on a Sunday so every row of the grid is one weekday", () => {
        // 2026-08-13 is a Thursday; its week starts Sunday 2026-08-09.
        const { from, to } = heatmapRange(16, "2026-08-13");
        expect(to).toBe("2026-08-13");
        expect(new Date(`${from}T12:00:00Z`).getUTCDay()).toBe(0);
        expect(from).toBe("2026-04-26");
    });

    it("still starts on a Sunday when today IS Sunday", () => {
        const { from } = heatmapRange(4, "2026-08-09");
        expect(from).toBe("2026-07-19");
        expect(new Date(`${from}T12:00:00Z`).getUTCDay()).toBe(0);
    });
});

describe("weekAlignedCells", () => {
    it("pads the head so the first day lands on its own weekday row", () => {
        // Thursday = index 4 counting from Sunday, so four spacers come first.
        const cells = weekAlignedCells([day("2026-08-13", "DONE")]);
        expect(cells).toHaveLength(5);
        expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
        expect(cells[4]?.day).toBe("2026-08-13");
    });

    it("pads nothing when the range already starts on a Sunday", () => {
        const cells = weekAlignedCells([day("2026-08-09", "DONE"), day("2026-08-10", "MISSED")]);
        expect(cells[0]?.day).toBe("2026-08-09");
        expect(cells).toHaveLength(2);
    });

    it("leaves an unfinished week unfinished instead of padding the tail", () => {
        const days = Array.from({ length: 9 }, (_, index) =>
            day(`2026-08-${String(9 + index).padStart(2, "0")}`, "DONE"),
        );
        expect(weekAlignedCells(days)).toHaveLength(9);
    });

    it("survives an empty history", () => {
        expect(weekAlignedCells([])).toEqual([]);
    });
});

describe("takeLastDays / countDone", () => {
    it("keeps the recent end when the response is longer than the strip", () => {
        const days = Array.from({ length: 28 }, (_, index) =>
            day(`2026-08-${String(index + 1).padStart(2, "0")}`, "DONE"),
        );
        const last = takeLastDays(days, 14);
        expect(last).toHaveLength(14);
        expect(last[13].day).toBe("2026-08-28");
    });

    it("returns everything when the response is shorter than asked for", () => {
        expect(takeLastDays([day("2026-08-01", "DONE")], 14)).toHaveLength(1);
    });

    it("counts only the days closed as done", () => {
        expect(
            countDone([
                day("2026-08-01", "DONE"),
                day("2026-08-02", "SKIPPED"),
                day("2026-08-03", "MISSED"),
                day("2026-08-04", "DONE"),
                day("2026-08-05", "UNKNOWN"),
            ]),
        ).toBe(2);
    });
});
