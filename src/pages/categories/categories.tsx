import CreateCategory from "../../components/categories/createCategory";
import RenderCategories from "../../components/categories/renderCategories";
import EditCategory from "../../components/categories/editCategory";
import { useDispatch, useSelector } from "react-redux";
import Header from "../../components/header";
import { useEffect } from "react";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { editModeEnter } from "../../redux/category/editCategorySlice";
import getCategories from "../../services/categories/getCategories";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";
import { useTranslation } from "react-i18next";
import { enterCategories } from "../../redux/category/categoriesSlice";
// import categoryGeneratedByAi from "../../types/category/categoryGeneratedByAiType";

function Categories(){
    useAuthGuard();
    
    const dispatch = useDispatch();
    const {t} = useTranslation();

    const editMode = useSelector((state: RootState) => state.editCategory.editMode);
    // const [generatedCategory, setGeneratedCategory] = useState<categoryGeneratedByAi>({categoryName: "", description: ""});
    const categories = useSelector((state: RootState) => state.categories.categories);

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);
    
    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(t);
            if(Array.isArray(response.success)){
                dispatch(enterCategories(response.success));
            }else if(response.error = t('Get categories return a error')){
                dispatch(defaultErrorEnter(response.error));
            }
        }
        returnCategories();
    }, [t]);
    
    return(
        <div className="bg-background min-h-screen text-secondary">
            <Header pageName={"YourCategories"}/>
            <main className="flex flex-col lg:flex-row lg:justify-start lg:items-start pb-4 lg:mb-0 mt-4 px-3 lg:px-6">
                <div className="w-[100%] lg:w-[58%]">
                    <RenderCategories categories={categories} />
                </div>
                <div className="lg:flex lg:flex-col w-[100%] lg:w-[42%]">
                    {editMode ? <EditCategory dispatchFunction={enterCategories}/> : 
                    <CreateCategory dispatchFunction={enterCategories} />}
                </div>
            </main>
        </div>
    )
}

export default Categories;
