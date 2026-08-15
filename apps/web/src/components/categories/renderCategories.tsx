//Components
import CategoryBox from "./categoryBox";
import EmptyState from "../EmptyState";
import { Folder, Search } from "lucide-react";
//Functions
import { useTranslation } from "react-i18next";
//Types
import categoryType from "@beyou/types/category/categoryType";

type props = {
    categories: Array<categoryType>,
    /** That week of XP per category id. Absent until the window loads. */
    xpSeriesById?: Record<string, number[]>,
    /** Sobrescreve a mensagem de lista vazia (ex.: busca sem resultado). */
    emptyTitle?: string,
    /** Limpa a busca a partir do estado vazio. */
    onClearFilters?: () => void
}

function RenderCategories({categories, xpSeriesById, emptyTitle, onClearFilters}: props){
    const {t} = useTranslation();

    return(
        // 3 columns on desktop, 1 on mobile — a scannable grid, no side-by-side form.
        // items-start: without it the row stretches the neighbouring cards to the
        // expanded one's height — the whole row "grew along" with whatever was open.
        <div
            className="grid grid-cols-1 items-start gap-4 text-text md:grid-cols-2 lg:grid-cols-3"
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
                    xpSeries={xpSeriesById?.[category.id]}
                    habits={category.habits ? new Map(Object.entries(category.habits)) : undefined}
                    tasks={category.tasks ? new Map(Object.entries(category.tasks)) : undefined}
                    goals={category.goals ? new Map(Object.entries(category.goals)) : undefined}
                    />
                </div>
                ))    
            ) : (
                emptyTitle ? (
                <EmptyState
                    icon={<Search size={20} aria-hidden="true" />}
                    title={emptyTitle}
                    description={t('NoResultsDescription')}
                    actionLabel={onClearFilters ? t('ClearFilters') : undefined}
                    onAction={onClearFilters}
                    variant="ghost"
                />
            ) : (
                <EmptyState
                    icon={<Folder size={20} aria-hidden="true" />}
                    title={t('0CategoriesTitle')}
                    description={t('0CategoriesMessage')}
                />
            )
            )}
        </div>
    )
}

export default RenderCategories;
