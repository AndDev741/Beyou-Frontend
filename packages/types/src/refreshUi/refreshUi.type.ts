export type RefreshUI = {
    refreshUser?: refreshUser,
    refreshCategories?: refreshObject[],
    refreshHabit?: refreshObject,
    refreshItemChecked?: refreshItemChecked
}

type refreshUser = {
    currentConstance: number,
    alreadyIncreaseConstanceToday: boolean,
    maxConstance: number,
    xp: number,
    level:number,
    actualLevelXp: number,
    nextLevelXp: number
}

type refreshObject = {
    id: string,
    xp: number,
    level:number,
    actualLevelXp: number,
    nextLevelXp: number,
    /**
     * The habit's check scalars, post-check, so the card repaints without a second
     * `GET /habit` — which matters most at the exact moment the number changes.
     *
     * Optional because owners that are earned into but never checked (categories)
     * report zeros here, and because a response cached before this shipped has no
     * such fields. A reader must fall back to what it already had, not to zero.
     */
    currentStreak?: number,
    bestStreak?: number,
    totalCheckIns?: number
}

type refreshItemChecked = {
    groupItemId: string,
    check: {
        id: string,
        checkDate: string,
        checkTime: string,
        checked: boolean,
        skipped?: boolean,
        xpGenerated: number
    }
}
