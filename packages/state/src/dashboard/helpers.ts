/**
 * Pure, platform-agnostic dashboard derivations shared by web and mobile.
 * No React / DOM / canvas — safe to import from React Native.
 */

export type GreetingKey = "GoodMorning" | "GoodAfternoon" | "GoodEvening" | "GoodNight";

/** Maps an hour (0-23) to the i18n greeting key. */
export function getGreetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return "GoodMorning";
  if (hour >= 12 && hour < 17) return "GoodAfternoon";
  if (hour >= 17 && hour < 21) return "GoodEvening";
  return "GoodNight";
}

/**
 * Percentage (0-100) of progress within the current level's XP window.
 * Mirrors the web levelProgress widget: clamped, rounded, guards a zero/negative
 * window. `xp` is the total XP; `actualLevelXp`/`nextLevelXp` bound the level.
 */
export function calculateLevelProgress(
  xp: number,
  actualLevelXp: number,
  nextLevelXp: number,
): number {
  const xpWindow = nextLevelXp - actualLevelXp;
  if (xpWindow <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((xp - actualLevelXp) / xpWindow) * 100)));
}
