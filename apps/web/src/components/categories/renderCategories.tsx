//Components
import CategoryBox from "./categoryBox";
import EmptyState from "../EmptyState";
//Functions
import { useTranslation } from "react-i18next";
//Types
import categoryType from "@beyou/types/category/categoryType";

type props = {categories: Array<categoryType>}

function RenderCategories({categories}: props){
    const {t} = useTranslation();

    return(
        <div
            className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 text-secondary"
            data-tutorial-id="categories-grid"
        >
            {categories.length > 0 ? (
                categories.map((category, index) => (
                <div
                key={category.id}
                className="lg:mx-1"
                data-tutorial-id={index === 0 ? "category-card" : undefined}
                >
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
                <EmptyState emoji="🗂️" title={t('0CategoriesMessage')} />
            )}
        </div>
    )
}

export default RenderCategories;
