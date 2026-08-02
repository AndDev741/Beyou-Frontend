//Components
import CategoryBox from "./categoryBox";
import EmptyState from "../EmptyState";
//Functions
import { useTranslation } from "react-i18next";
//Types
import categoryType from "@beyou/types/category/categoryType";

type props = {
    categories: Array<categoryType>,
    /** Sobrescreve a mensagem de lista vazia (ex.: busca sem resultado). */
    emptyTitle?: string
}

function RenderCategories({categories, emptyTitle}: props){
    const {t} = useTranslation();

    return(
        // 3 colunas no desktop, 1 no mobile — grade escaneável, sem formulário ao lado.
        <div
            className="grid grid-cols-1 gap-4 text-text md:grid-cols-2 lg:grid-cols-3"
            data-tutorial-id="categories-grid"
        >
            {categories.length > 0 ? (
                categories.map((category, index) => (
                <div
                key={category.id}
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
                <EmptyState emoji="🗂️" title={emptyTitle ?? t('0CategoriesMessage')} />
            )}
        </div>
    )
}

export default RenderCategories;
