import { CategoryMiniDTO } from "../category/CategoryMiniDTO";

export type task = {
    id: string,
    name: string,
    description?: string,
    iconId: string,
    importance?: number,
    difficulty?: number,
    categories?: Record<string, CategoryMiniDTO>;
    oneTimeTask: boolean,
    /**
     * The same five check scalars a habit carries, with the same meaning.
     *
     * A one-time task is checked once and never builds a run, so nothing ever
     * writes to these: they stay at zero (and `firstCheckInDate` null) for the life
     * of the task. `oneTimeTask` already says which kind this is — do not draw a
     * streak for one.
     */
    currentStreak?: number,
    bestStreak?: number,
    totalCheckIns?: number,
    firstCheckInDate?: string | null,
    streakDormant?: boolean,
    markedToDelete: Date,
    createdAt: Date,
    updatedAt: Date
}
