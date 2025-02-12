import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import getCategories from "../../services/categories/getCategories";
import CategoryBox from "./categoryBox";

function RenderCategories({categories, setCategories}){
    const {t} = useTranslation();
    const userId = useSelector(state => state.perfil.id);
    
    useEffect(() => {
        async function returnCategories(){
            const response = await getCategories(userId);
            if(response.success){
                setCategories(response.success);
            }else{
                console.error(response);
            }
        }
        returnCategories();
    }, [userId, setCategories])

    return(
        <div className="p-2 md:p-3 flex flex-wrap justify-between md:justify-evenly lg:justify-start">
            {categories.length > 0 ? (
                categories.map((category) => (
                <div key={category.id} 
                className="lg:mx-1">
                    <CategoryBox id={category.id}
                    iconName={category.iconId}
                    name={category.name}
                    description={category.description}
                    level={category.level}
                    xp={category.xp} 
                    nextLevelXp={category.nextLevelXp}
                    actualLevelXp={category.actualLevelXp}
                    setCategories={setCategories}
                    userId={userId}/>
                    </div>
                ))    
            ) : (
                <h2 className="text-blueMain font-semibold text-[30px] md:text-[40px] text-center lg:text-start lg:mt-12">{t('0CategoriesMessage')}</h2>
            )}
        </div>
    )
}

export default RenderCategories;