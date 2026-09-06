/**
 * Daily mood and journaling, as the server keeps it.
 *
 * Wire names match the backend's `MoodEntryResponseDTO`.
 */

/** The five-point scale. 1 is the worst day, 5 the best. */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type MoodEntry = {
    id: string;
    /** The user's local day as `yyyy-MM-dd`, resolved by the server. */
    date: string;
    mood: MoodLevel;
    /** The journal. Null when the day has a mood and nothing written. */
    note: string | null;
    updatedAt: string;
};

/** Longest note the API accepts, mirroring `MoodEntry.MAX_NOTE_LENGTH` on the server. */
export const MAX_MOOD_NOTE_LENGTH = 4000;
