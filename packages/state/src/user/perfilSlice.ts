import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Theme } from "@beyou/theme";
import type { UserType } from "@beyou/types/user/UserType";

type userInitialState = {
    username: string;
    email: string;
    phrase: string;
    phrase_author: string;
    constance: number;
    photo: string;
    isGoogleAccount: boolean;
    checkedItemsInScheduledRoutine: number;
    totalItemsInScheduledRoutine: number;
    widgetsIdsInUse: string[];
    // null = no saved preference yet (login / brand-new account). ThemeContext
    // falls back to OS color-scheme detection when this is null.
    themeInUse: Theme | null;
    xp: number,
    level: number,
    nextLevelXp: number,
    actualLevelXp: number,
    maxConstance: number,
    alreadyIncreaseConstanceToday: boolean,
    languageInUse: string,
    isTutorialCompleted: boolean,
    timezone: string,
    xpDecayStrategy: "GRADUAL" | "FLAT" | "TIME_WINDOW",
}

const initialState: userInitialState = {
    username: "",
    email: "",
    phrase: "",
    phrase_author: "",
    constance: 0,
    photo: "",
    isGoogleAccount: false,
    checkedItemsInScheduledRoutine: 0,
    totalItemsInScheduledRoutine: 0,
    widgetsIdsInUse: [],
    themeInUse: null,
    xp: 0,
    level: 0,
    nextLevelXp: 0,
    actualLevelXp: 0,
    maxConstance: 0,
    alreadyIncreaseConstanceToday: false,
    languageInUse: "",
    isTutorialCompleted: false,
    timezone: "UTC",
    xpDecayStrategy: "GRADUAL",
}

const perfilSlice = createSlice({
    name: 'perfil',
    initialState,
    reducers: {
        // Bulk-hydrate the slice from a UserType (GET /user). Additive; each field
        // is applied only when present so partial payloads are safe. `themeInUse`
        // is intentionally NOT mapped here — it is a Theme object in this slice but
        // a string code in UserType, and theming is owned elsewhere per platform.
        hydratePerfil(state, action: PayloadAction<Partial<UserType>>){
            const u = action.payload ?? {};
            return {
                ...state,
                username: u.name ?? state.username,
                email: u.email ?? state.email,
                phrase: u.phrase ?? state.phrase,
                phrase_author: u.phrase_author ?? state.phrase_author,
                constance: u.constance ?? state.constance,
                photo: u.photo ?? state.photo,
                isGoogleAccount: u.isGoogleAccount ?? state.isGoogleAccount,
                widgetsIdsInUse: u.widgetsId ?? state.widgetsIdsInUse,
                xp: u.xp ?? state.xp,
                level: u.level ?? state.level,
                nextLevelXp: u.nextLevelXp ?? state.nextLevelXp,
                actualLevelXp: u.actualLevelXp ?? state.actualLevelXp,
                maxConstance: u.maxConstance ?? state.maxConstance,
                alreadyIncreaseConstanceToday:
                    u.constanceIncreaseToday ?? state.alreadyIncreaseConstanceToday,
                languageInUse: u.languageInUse ?? state.languageInUse,
                isTutorialCompleted: u.isTutorialCompleted ?? state.isTutorialCompleted,
                timezone: u.timezone ?? state.timezone,
                xpDecayStrategy: u.xpDecayStrategy ?? state.xpDecayStrategy,
            };
        },
        nameEnter(state, action){
            const username = typeof action.payload === "string" ? action.payload : "";
            return {...state, username};
        },
        emailEnter(state, action){
            const email = typeof action.payload === "string" ? action.payload : "";
            return {...state, email};
        },
        phraseEnter(state, action){
            const phrase = typeof action.payload === "string" ? action.payload : "";
            return {...state, phrase};
        },
        phraseAuthorEnter(state, action){
            const phrase_author = typeof action.payload === "string" ? action.payload : "";
            return {...state, phrase_author};
        },
        constanceEnter(state, action){
            const constance = action.payload;
            return {...state, constance};
        },
        photoEnter(state, action){
            const photo = typeof action.payload === "string" ? action.payload : "";
            return {...state, photo};
        },
        isGoogleAccountEnter(state, action){
            const isGoogleAccount = action.payload;
            return {...state, isGoogleAccount}
        },
        checkedItemsInScheduledRoutineEnter(state, action){
            const checkedItemsInScheduledRoutine = action.payload;
            return {...state, checkedItemsInScheduledRoutine};
        },
        totalItemsInScheduledRoutineEnter(state, action){
            const totalItemsInScheduledRoutine = action.payload;
            return {...state, totalItemsInScheduledRoutine};
        },
        widgetsIdInUseEnter(state, action){
            const widgetsIdsInUse = action.payload;
            return {...state, widgetsIdsInUse};
        },
        themeInUseEnter(state, action){
            const themeInUse = action.payload;
            return {...state, themeInUse};
        },
        xpEnter(state, action){
            const xp = action.payload;
            return {...state, xp};
        },
        levelEnter(state, action){
            const level = action.payload;
            return {...state, level};
        },
        nextLevelXpEnter(state, action){
            const nextLevelXp = action.payload;
            return {...state, nextLevelXp};
        },
        actualLevelXpEnter(state, action){
            const actualLevelXp = action.payload;
            return {...state, actualLevelXp};
        },
        maxConstanceEnter(state, action){
            const maxConstance = action.payload;
            return {...state, maxConstance};
        },
        alreadyIncreaseConstanceTodayEnter(state, action){
            const alreadyIncreaseConstanceToday = action.payload;
            return {...state, alreadyIncreaseConstanceToday};
        },
        languageInUserEnter(state, action){
            const languageInUse = typeof action.payload === "string" ? action.payload : "";
            return {...state, languageInUse};
        },
        tutorialCompletedEnter(state, action){
            const isTutorialCompleted = Boolean(action.payload);
            return {...state, isTutorialCompleted};
        },
        timezoneEnter(state, action){
            const timezone = typeof action.payload === "string" ? action.payload : "UTC";
            return {...state, timezone};
        },
        xpDecayStrategyEnter(state, action){
            const valid = ["GRADUAL", "FLAT", "TIME_WINDOW"] as const;
            const xpDecayStrategy = valid.includes(action.payload) ? action.payload : "GRADUAL";
            return {...state, xpDecayStrategy};
        },
    }
});

export const {
    hydratePerfil,
    nameEnter,
    emailEnter,
    phraseEnter,
    phraseAuthorEnter,
    constanceEnter,
    photoEnter,
    isGoogleAccountEnter,
    checkedItemsInScheduledRoutineEnter,
    totalItemsInScheduledRoutineEnter,
    widgetsIdInUseEnter,
    themeInUseEnter,
    xpEnter,
    levelEnter,
    nextLevelXpEnter,
    actualLevelXpEnter,
    maxConstanceEnter,
    alreadyIncreaseConstanceTodayEnter,
    languageInUserEnter,
    tutorialCompletedEnter,
    timezoneEnter,
    xpDecayStrategyEnter
} = perfilSlice.actions;

export default perfilSlice.reducer;
