/**
 * "HH:mm" to minutes-since-midnight and back, shared by everything that has to reason about
 * a routine's clock.
 *
 * Lifted out of `suggestSlots.ts`, which had the only copy, because the focus resolver needs
 * the identical arithmetic and a second copy of midnight handling is how the two drift.
 */

/** "07:30" to 450. A malformed value gives NaN, which every caller must treat as "no time". */
export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** 450 to "07:30". Wraps, so 1470 is "00:30" rather than "24:30". */
export const fromMinutes = (minutes: number): string => {
  const total = ((minutes % 1440) + 1440) % 1440;
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

export const MINUTES_PER_DAY = 1440;
