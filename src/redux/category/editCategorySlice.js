import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    editMode: false,
    id: null,
    name: "",
    description: "",
    icon: ""
}

const editCategorySlice = createSlice({
    name: 'editCategory',
    initialState,
    reducers: {
        editModeEnter(state, action){
            const editMode = action.payload;
            return {...state, editMode};
        },
        idEnter(state, action){
            const id = action.payload;
            return {...state, id};
        },
        nameEnter(state, action){
            const name = action.payload;
            return {...state, name};
        },
        descriptionEnter(state, action){
            const description = action.payload;
            return {...state, description};
        },
        iconEnter(state, action){
            const icon = action.payload;
            return {...state, icon};
        }
    }
});

export const {editModeEnter ,idEnter, nameEnter, descriptionEnter, iconEnter} = editCategorySlice.actions;

export default editCategorySlice.reducer;