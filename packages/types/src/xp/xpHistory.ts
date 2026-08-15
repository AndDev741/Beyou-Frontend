/** One entity's XP across a window, aligned index-for-index with the response's `days`. */
export type XpOwnerType = "USER" | "CATEGORY" | "HABIT" | "ROUTINE";

export type XpOwnerSeries = {
  ownerType: XpOwnerType;
  ownerId: string;
  /** XP per day, oldest first. Zero where nothing happened, negative where it was returned. */
  values: number[];
};

/**
 * `days` is the x axis, sent once instead of repeated inside every series: each
 * `values` array lines up with it index for index.
 */
export type XpHistory = {
  from: string;
  to: string;
  days: string[];
  series: XpOwnerSeries[];
};
