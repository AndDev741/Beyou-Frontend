export type UserType = {
    /**
     * The account's opaque UUID — the only identity product analytics may use
     * (never email or name). Optional because a backend built before it was
     * added to UserResponseDTO simply omits it; analytics then stays anonymous
     * rather than the app breaking on a missing field.
     */
    id?: string,
    name: string,
    email: string,
    phrase: string,
    phrase_author: string,
    /**
     * The account streak, now aware of scheduling: it only breaks on a day where
     * something was scheduled and left undone. A Mon/Wed/Fri user no longer zeroes
     * every Tuesday.
     */
    constance: number,
    /**
     * The run still stands but nothing has been scheduled for two weeks. Label it
     * instead of celebrating a number whose last check-in was three weeks ago.
     */
    constanceDormant: boolean,
    photo: string,
    isGoogleAccount: boolean,
    widgetsId: string[],
    themeInUse: string,
    xp: number,
    level: number,
    nextLevelXp: number,
    actualLevelXp: number,
    constanceIncreaseToday: boolean,
    maxConstance: number,
    languageInUse: string,
    isTutorialCompleted: boolean,
    timezone: string,
    /**
     * Whether `timezone` was ever actually chosen, or is just the value every account
     * starts with. Only `DEFAULT` may be adopted over: see `reconcileTimezone`.
     */
    timezoneSource: "DEFAULT" | "DETECTED" | "EXPLICIT",
    xpDecayStrategy: "GRADUAL" | "FLAT" | "TIME_WINDOW"
}
