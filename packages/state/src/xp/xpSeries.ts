import type { XpHistory, XpOwnerType } from "@beyou/types/xp/xpHistory";

/**
 * One owner's week out of `GET /xp/history`, for a chart.
 *
 * The endpoint only emits a series for owners that MOVED inside the window: a
 * category that earned nothing in seven days is simply absent from the response.
 * For months both clients read that absence as "no data" and fell back to the level
 * bar, so the best area (the category with the most XP ever, and often the one
 * coasting this week) almost never showed its chart. Absence after the response has
 * landed means zero, and zero is an answer: a flat week of slivers says "nothing this
 * week" where a level bar says nothing about the week at all.
 *
 * Returns undefined only while there is no response yet (or one with no axis), which
 * is the case the level-bar fallback exists for.
 */
export function seriesFor(
  history: XpHistory | null | undefined,
  ownerType: XpOwnerType,
  ownerId: string | undefined
): number[] | undefined {
  if (!history || !Array.isArray(history.days) || history.days.length === 0 || !ownerId) {
    return undefined;
  }
  const series = Array.isArray(history.series) ? history.series : [];
  const own = series.find((entry) => entry.ownerType === ownerType && entry.ownerId === ownerId);
  return own?.values ?? history.days.map(() => 0);
}
