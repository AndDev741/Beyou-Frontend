import { describe, expect, it } from "vitest";
import { seriesFor } from "../xpSeries";
import type { XpHistory } from "@beyou/types/xp/xpHistory";

const history: XpHistory = {
  from: "2026-08-09",
  to: "2026-08-15",
  days: ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15"],
  series: [{ ownerType: "CATEGORY", ownerId: "career", values: [0, 0, 0, 0, 0, 0, 115] }],
};

describe("seriesFor", () => {
  it("hands back the owner's own week when the endpoint sent one", () => {
    expect(seriesFor(history, "CATEGORY", "career")).toEqual([0, 0, 0, 0, 0, 0, 115]);
  });

  /**
   * The endpoint omits owners that did not move in the window. Once the response is
   * in, that omission means "zero all week", and the chart draws it as such instead of
   * disappearing behind the level bar.
   */
  it("turns an owner absent from a landed response into a week of zeros", () => {
    expect(seriesFor(history, "CATEGORY", "pet")).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("stays undefined while there is no response yet", () => {
    expect(seriesFor(null, "CATEGORY", "pet")).toBeUndefined();
    expect(seriesFor(undefined, "CATEGORY", "pet")).toBeUndefined();
    expect(seriesFor({ ...history, days: [] }, "CATEGORY", "pet")).toBeUndefined();
  });

  it("tolerates a response without a series array", () => {
    expect(seriesFor({ ...history, series: undefined as never }, "CATEGORY", "pet")).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("has nothing to say without an owner", () => {
    expect(seriesFor(history, "CATEGORY", undefined)).toBeUndefined();
  });
});
