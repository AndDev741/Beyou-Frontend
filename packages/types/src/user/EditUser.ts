export type EditUser = {
    name?: string,
    photo?: string
    phrase?: string,
    phrase_author?: string
    widgetsId?: string[]
    theme?: string,
    constanceConfiguration?: "ANY" | "COMPLETE",
    language?: string,
    isTutorialCompleted?: boolean,
    timezone?: string,
    /**
     * Narrowed to the one value a client ever has a reason to send. A zone the PERSON
     * picked carries no source at all (the backend reads that as explicit and makes it
     * permanent); `DEFAULT` is rejected outright. Typing it this way makes the wrong
     * call a compile error instead of a runtime 400.
     */
    timezoneSource?: "DETECTED",
    xpDecayStrategy?: "GRADUAL" | "FLAT" | "TIME_WINDOW"
}
