import { createSlice } from "@reduxjs/toolkit";
import { ThemeType } from "../../context/ThemeContext";
import { themes } from "../../components/utils/listOfThemes";

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
    themeInUse: ThemeType;
    xp: number,
    level: number,
    nextLevelXp: number,
    actualLevelXp: number,
    maxConstance: number,
    alreadyIncreaseConstanceToday: boolean,
    languageInUse: string,
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
    themeInUse: themes[0],
    xp: 0,
    level: 0,
    nextLevelXp: 0,
    actualLevelXp: 0,
    maxConstance: 0,
    alreadyIncreaseConstanceToday: false,
    languageInUse: "",
}

const perfilSlice = createSlice({
    name: 'perfil',
    initialState,
    reducers: {
        nameEnter(state, action){
            const username = action.payload;
            return {...state, username};
        },
        emailEnter(state, action){
            const email = action.payload;
            return {...state, email};
        },
        phraseEnter(state, action){
            const phrase = action.payload;
            return {...state, phrase};
        },
        phraseAuthorEnter(state, action){
            const phrase_author = action.payload;
            return {...state, phrase_author};
        },
        constanceEnter(state, action){
            const constance = action.payload;
            return {...state, constance};
        },
        photoEnter(state, action){
            const photo = action.payload;
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
            const alreadyIncreaseConstance = action.payload;
            return {...state, alreadyIncreaseConstance};
        },
        languageInUserEnter(state, action){
            const languageInUse = action.payload;
            return {...state, languageInUse};
        },
    }
});

export const {
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
    languageInUserEnter
} = perfilSlice.actions;

export default perfilSlice.reducer;