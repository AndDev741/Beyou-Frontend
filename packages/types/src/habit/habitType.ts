import category from "../category/categoryType"

export type habit = {
    id: string,
    name: string,
    description: string,
    motivationalPhrase:string,
    iconId: string,
    categories: category[],
    routines: Record<string, string>, //id, name
    importance:number,
    dificulty: number,
    xp: number,
    level: number,
    nextLevelXp: number,
    actualLevelXp: number,
    /** Days in the run up to and including the last check-in. A real streak: a missed scheduled day zeroes it. */
    currentStreak: number,
    /** The longest run ever reached. Never decreases. */
    bestStreak: number,
    /** Lifetime count of days closed as done. This is what the old `constance` field held. */
    totalCheckIns: number,
    /** `yyyy-MM-dd`, or null until the first check-in ever. */
    firstCheckInDate: string | null,
    /**
     * The run still stands but nothing has been scheduled or checked for two weeks.
     * The number ships unchanged beside it — a paused run is not a broken one — so
     * the UI labels it instead of showing "5 days in a row" three weeks after the fact.
     */
    streakDormant: boolean,
    createdAt: Date,
    updatedAt: Date
}
