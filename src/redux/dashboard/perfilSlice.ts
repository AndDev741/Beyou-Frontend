import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    username: "",
    email: "",
    phrase: "",
    phrase_author: "",
    constance: 0,
    photo: "",
    isGoogleAccount: false,
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
        }
    }
});

export const {nameEnter, emailEnter, phraseEnter, phraseAuthorEnter, constaceEnter, photoEnter, isGoogleAccountEnter} = perfilSlice.actions;

export default perfilSlice.reducer;