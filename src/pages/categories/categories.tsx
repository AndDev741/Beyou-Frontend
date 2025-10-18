import CreateCategory from "../../components/categories/createCategory";
import RenderCategories from "../../components/categories/renderCategories";
import EditCategory from "../../components/categories/editCategory";
import { useSelector } from "react-redux";
import Header from "../../components/header";
import GenerateCategoryByAi from "../../components/categories/generateCategoryByAi";
import { useState } from "react";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import categoryType from "../../types/category/categoryType";
import categoryGeneratedByAi from "../../types/category/categoryGeneratedByAiType";

function Categories(){
    useAuthGuard();

    const editMode: boolean = useSelector((state: RootState) => state.editCategory.editMode);
    const [generatedCategory, setGeneratedCategory] = useState<categoryGeneratedByAi>({categoryName: "", description: ""});
    const [categories, setCategories] = useState<Array<categoryType>>([]);
    
    return(
        <div className="bg-background min-h-screen text-secondary">
            <Header pageName={"YourCategories"}/>
            <main className="flex flex-col lg:flex-row lg:justify-start lg:items-start pb-4 lg:mb-0 mt-4 px-3 lg:px-6">
                <div className="w-[100%] lg:w-[58%]">
                    <RenderCategories categories={categories} setCategories={setCategories} />
                </div>
                <div className="lg:flex lg:flex-col w-[100%] lg:w-[42%]">
                    {editMode ? <EditCategory setCategories={setCategories}/> : 
                    <CreateCategory generatedCategory={generatedCategory} setCategories={setCategories} />}
                    
                    {editMode ? null : <GenerateCategoryByAi
                    setGeneratedCategory={setGeneratedCategory}/>}
                </div>
            </main>
        </div>
    )
}

export default Categories;
