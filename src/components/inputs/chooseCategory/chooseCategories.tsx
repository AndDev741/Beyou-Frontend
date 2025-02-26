import { useEffect, useState } from "react";
import getCategories from "../../../services/categories/getCategories";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CategoryItem from "./categoryItem";
import category from "../../../types/category/categoryType";
import { RootState } from "../../../redux/rootReducer";

type chooseCategoriesProps = {
    categoriesIdList: string[],
    setCategoriesIdList: React.Dispatch<React.SetStateAction<string[]>>,
    errorMessage: string,
    chosenCategories: category[] | null
}

function ChooseCategories({categoriesIdList, setCategoriesIdList, errorMessage, chosenCategories}: chooseCategoriesProps){
    const {t} = useTranslation();
    const userId = useSelector((state: RootState)  => state.perfil.id);
    const [categories, setCategories] = useState<category[]>([]);

    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(userId, t);
            if(response.success && Array.isArray(response.success)){
                setCategories(response.success);
            }else{
                console.error(response);
            }
        };

        returnCategories();
    }, [t, userId])
    return(
        <>
            <h3 className="text-2xl mt-2 text-center">Categories</h3>
            <p className='text-red-500 text-lg text-center'>{errorMessage}</p>
            <div className="flex flex-col items-center w-[95vw] md:w-[600px] overflow-auto mt-2">
                <div className="flex items-center justify-between">
                    {categories.length > 0 ? categories.map((category) => (
                        
                        <div key={category.id} 
                        className="flex flex-col items-center line-clamp-1 w-[150px] lg:w-[150px]">
                            <CategoryItem
                            key={category.id}
                            categoriesIdList={categoriesIdList}
                            setCategoriesIdList={setCategoriesIdList}
                            categoryId={category.id}
                            name={category.name}
                            iconId={category.iconId}
                            chosenCategories={chosenCategories}/>
                        </div>
                    
                    )): (

                    <h1>{t("YouDontHaveCategories")}</h1>
                    )}
                </div>
            </div>
        </>
        
    )
}

export default ChooseCategories;