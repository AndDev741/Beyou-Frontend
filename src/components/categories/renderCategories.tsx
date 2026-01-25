//Components
import CategoryBox from "./categoryBox";
//Functions
import { useTranslation } from "react-i18next";
//Types
import categoryType from "../../types/category/categoryType";

type props = {categories: Array<categoryType>}

function RenderCategories({categories}: props){
    const {t} = useTranslation();

    return(
        <div className="p-2 md:p-3 flex flex-wrap justify-between md:justify-evenly lg:justify-between w-full text-secondary">
            {categories.length > 0 ? (
                categories.map((category) => (
                <div key={category.id} 
                className="lg:mx-1">
                    <CategoryBox 
                    id={category.id}
                    iconId={category.iconId}
                    name={category.name}
                    description={category.description}
                    level={category.level}
                    xp={category.xp} 
                    nextLevelXp={category.nextLevelXp}
                    actualLevelXp={category.actualLevelXp}
                    habits={category.habits ? new Map(Object.entries(category.habits)) : undefined}
                    tasks={category.tasks ? new Map(Object.entries(category.tasks)) : undefined}
                    goals={category.goals ? new Map(Object.entries(category.goals)) : undefined}
                    />
                </div>
                ))    
            ) : (
                <h2 className="text-primary font-semibold text-[30px] md:text-[40px] text-center lg:text-start lg:mt-12">{t('0CategoriesMessage')}</h2>
            )}
        </div>
    )
}

export default RenderCategories;
