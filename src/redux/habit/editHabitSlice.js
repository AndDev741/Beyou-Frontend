import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    editMode: false,
    id: null,
    name: "",
    description: "",
    motivationalPhrase: "",
    iconId: "",
    importance: "",
    dificulty: "",
    categoriesId: []
}

const editHabitSlice = createSlice({
    name: 'editHabit',
    initialState,
    reducers: {
        editModeEnter(state, action){
            const editMode = action.payload;
            return {...state, editMode};
        },
        editIdEnter(state, action){
            const id = action.payload;
            return {...state, id};
        },
        editNameEnter(state, action){
            const name = action.payload;
            return {...state, name};
        },
        editDescriptionEnter(state, action){
            const description = action.payload;
            return {...state, description};
        },
        editMotivationalPhraseEnter(state, action){
            const motivationalPhrase = action.payload;
            return {...state, motivationalPhrase};
        },
        editIconIdEnter(state, action){
            const iconId = action.payload;
            return {...state, iconId};
        },
        editImportanceEnter(state, action){
            const importance = action.payload;
            return {...state, importance};
        },
        editDificultyEnter(state, action){
            const dificulty = action.payload;
            return {...state, dificulty};
        },
        editCaegoriesIdEnter(state, action){
            const categoriesId = action.payload;
            return {...state, categoriesId};
        }
    }

});

export const {editModeEnter, editNameEnter, editDescriptionEnter, editMotivationalPhraseEnter, editIconIdEnter, editImportanceEnter, editDificultyEnter, editCaegoriesIdEnter} = editHabitSlice.actions;

export default editHabitSlice.reducer;
