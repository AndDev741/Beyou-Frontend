import { createSlice } from "@reduxjs/toolkit";
import category from "../../types/category/categoryType";
import { widgetsIds } from "../../components/widgets/utils/widgetsFabric";
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
    categoryWithMoreXp: category | null;
    categoryWithLessXp: category | null;
    checkedItemsInScheduledRoutine: number;
    totalItemsInScheduledRoutine: number;
    widgetsIdInUse: string[];
    themeInUse: ThemeType;
}

const initialState = {
    username: "",
    email: "",
    phrase: "",
    phrase_author: "",
    constance: 0,
    photo: "",
    isGoogleAccount: false,
    categoryWithMoreXp: null,
    categoryWithLessXp: null,
    checkedItemsInScheduledRoutine: 0,
    totalItemsInScheduledRoutine: 0,
    widgetsIdsInUse: [],
    themeInUse: themes[0]
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
        constaceEnter(state, action){
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
        categoryWithMoreXpEnter(state, action){
            const categoryWithMoreXp = action.payload;
            return {...state, categoryWithMoreXp};
        },
        categoryWithLessXpEnter(state, action){
            const categoryWithLessXp = action.payload;
            return {...state, categoryWithLessXp};
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
    }
});

export const {
    nameEnter, 
    emailEnter, 
    phraseEnter, 
    phraseAuthorEnter, 
    constaceEnter, 
    photoEnter, 
    isGoogleAccountEnter,
    categoryWithMoreXpEnter,
    categoryWithLessXpEnter,
    checkedItemsInScheduledRoutineEnter,
    totalItemsInScheduledRoutineEnter,
    widgetsIdInUseEnter,
    themeInUseEnter
} = perfilSlice.actions;

export default perfilSlice.reducer;