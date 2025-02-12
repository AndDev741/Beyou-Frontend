import CreateCategory from "../../components/categories/createCategory";
import VerifyAuth from "../../components/verifyAuthentication";
import RenderCategories from "../../components/categories/renderCategories";
import EditCategory from "../../components/categories/editCategory";
import { useSelector } from "react-redux";
import Header from "../../components/header";
import GenerateCategoryByAi from "../../components/categories/generateCategoryByAi";
import { useState } from "react";

function Categories(){
    const editMode = useSelector(state => state.editCategory.editMode);
    const [generatedCategories, setGeneratedCategories] = useState({});
    const [categories, setCategories] = useState([]);
    return(
        <>
        <VerifyAuth />
            <Header pageName={"YourCategories"}/>
            <main className="flex flex-col lg:flex-row lg:justify-start lg:items-start mb-4 lg:mb-0 mt-4">
                <div className="w-[100%] lg:w-[58%]">
                    <RenderCategories categories={categories} setCategories={setCategories} />
                </div>
                <div className="lg:flex lg:flex-col w-[100%] lg:w-[42%]">
                    {editMode ? <EditCategory setCategories={setCategories}/> : 
                    <CreateCategory generatedCategories={generatedCategories} setCategories={setCategories} />}
                    
                    {editMode ? null : <GenerateCategoryByAi generatedCategories={generatedCategories}
                    setGeneratedCategories={setGeneratedCategories}/>}
                </div>
            </main>
        </>
    )
}

export default Categories;