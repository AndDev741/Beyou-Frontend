import { createSlice } from "@reduxjs/toolkit";
import category from "../../types/category/categoryType";

const initialState: {
    editMode: boolean;
    id: string;
    name: string;
    description: string;
    motivationalPhrase: string;
    iconId: string;
    importance: number;
    dificulty: number;
    categories: category[]; // ⬅️ Corrigido para um array do tipo Category
  } = {
    editMode: false,
    id: "",
    name: "",
    description: "",
    motivationalPhrase: "",
    iconId: "",
    importance: 0,
    dificulty: 0,
    categories: [], // ⬅️ Agora TypeScript entende que é um array de Category
  };

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
            const categories = action.payload;
            return {...state, categories};
        }
    }

});

export const {editModeEnter, editIdEnter ,editNameEnter, editDescriptionEnter, editMotivationalPhraseEnter, editIconIdEnter, editImportanceEnter, editDificultyEnter, editCaegoriesIdEnter} = editHabitSlice.actions;

export default editHabitSlice.reducer;
