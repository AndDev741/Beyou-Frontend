import { createSlice } from "@reduxjs/toolkit";
import category from "../../types/category/categoryType";

const initialState: {
    editMode: boolean;
    id: string;
    name: string;
    description: string;
    iconId: string;
    importance: number | null;
    dificulty: number | null;
    categories: category[] | null;
    oneTimeTask: boolean;
  } = {
    editMode: false,
    id: "",
    name: "",
    description: "",
    iconId: "",
    importance: null,
    dificulty: null,
    categories: null,
    oneTimeTask: false,
  };

const editTaskSlice = createSlice({
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
        },
        editOneTimeTaskEnter(state, action) {
            const oneTimeTask = action.payload;
            return {...state, oneTimeTask};
        }
    }

});

export const {editModeEnter, editIdEnter ,editNameEnter, editDescriptionEnter, editIconIdEnter, editImportanceEnter, editDificultyEnter, editCaegoriesIdEnter, editOneTimeTaskEnter} = editTaskSlice.actions;

export default editTaskSlice.reducer;
