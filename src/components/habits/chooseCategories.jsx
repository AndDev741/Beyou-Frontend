import { useEffect, useState } from "react";
import getCategories from "../../services/categories/getCategories";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CategoryItem from "./categoryItem";


function ChooseCategories(){
    const {t} = useTranslation();
    const userId = useSelector(state  => state.perfil.id);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(userId);
            if(response.success){
                setCategories(response.success);
            }else{
                console.error(response);
            }
        };

        returnCategories();
    }, [])
    return(
        <>
            <h3 className="text-2xl mt-2 text-center">Categories</h3>

            <div className="flex flex-col items-center w-[300px] md:w-[600px] overflow-auto mt-2">
                <div className="flex items-center justify-between">
                    {categories.length > 0 ? categories.map((category) => (
                        
                        <div className="flex flex-col items-center line-clamp-1 w-[150px] lg:w-[150px]">
                            <CategoryItem
                            name={category.name}
                            iconId={category.iconId}/>
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