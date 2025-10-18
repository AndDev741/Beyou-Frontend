import { useEffect, useState } from "react";
import getCategories from "../../../services/categories/getCategories";
import { useTranslation } from "react-i18next";
import CategoryItem from "./categoryItem";
import category from "../../../types/category/categoryType";

type chooseCategoriesProps = {
    categoriesIdList: string[],
    setCategoriesIdList: React.Dispatch<React.SetStateAction<string[]>>,
    errorMessage: string,
    chosenCategories: category[] | null
}

function ChooseCategories({categoriesIdList, setCategoriesIdList, errorMessage, chosenCategories}: chooseCategoriesProps){
    const {t} = useTranslation();
    const [categories, setCategories] = useState<category[]>([]);

    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(t);
            if(response.success && Array.isArray(response.success)){
                setCategories(response.success);
            }else{
                console.error(response);
            }
        };

        returnCategories();
    }, [t])
    return(
        <>
            <h3 className="text-2xl mt-2 text-center text-secondary">Categories</h3>
            <p className='text-error text-lg text-center'>{errorMessage}</p>
            <div className="flex flex-wrap flex-col items-center w-[95vw] max-h-[200px] md:w-[100%] overflow-x-auto mt-2 text-secondary">
                <div className="flex flex-wrap items-center justify-evenly px-1 mb-2">
                    {categories.length > 0 ? categories.map((category) => (
                        
                        <div key={category.id} 
                        className="flex flex-col items-center line-clamp-1 px-2">
                            <CategoryItem
                            key={category.id}
                            categoriesIdList={categoriesIdList}
                            setCategoriesIdList={setCategoriesIdList}
                            categoryId={category.id}
                            name={category.name}
                            iconId={category.iconId}
                            chosenCategories={chosenCategories}
                            />
                        </div>
                    
                    )): (

                    <h1 className="text-primary">{t("YouDontHaveCategories")}</h1>
                    )}
                </div>
            </div>
        </>
        
    )
}

export default ChooseCategories;
