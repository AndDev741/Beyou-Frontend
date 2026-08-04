import { useEffect, useState } from "react";
import BeyouIcon from "../../../ui/BeyouIcon";
import category from "@beyou/types/category/categoryType";

type categoryItemProps = {
    name: string,
    iconId: string,
    categoryId: string,
    categoriesIdList: string[],
    setCategoriesIdList: React.Dispatch<React.SetStateAction<string[]>>,
    chosenCategories?: category[] | null
    chosenCategoriesId?: string[]
}

/**
 * O chip do seletor de categorias (catrow do mockup): ícone + nome em pílula;
 * selecionado fica com o acento suave. É um botão de verdade com estado de
 * checkbox no nome acessível.
 */
function CategoryItem({name, iconId, categoryId, categoriesIdList, setCategoriesIdList, chosenCategories, chosenCategoriesId}: categoryItemProps){
    const [alreadyChosen, setAlreadyChosen] = useState(false);

    const handleToggle = () => {
        const checked = !alreadyChosen;
        setAlreadyChosen(checked);
        if (checked) {
            // Guard against double-add: `alreadyChosen` (local UI state) can
            // desync from the actual list (e.g. a category auto-selected after
            // inline creation), which previously let the same id be appended
            // twice and produced a duplicate categoriesId in the payload.
            setCategoriesIdList(
                categoriesIdList.includes(categoryId) ? categoriesIdList : [...categoriesIdList, categoryId]
            );
        } else {
            setCategoriesIdList(categoriesIdList.filter((itemId) => itemId !== categoryId));
        }
    }

    useEffect(() => {
        if (chosenCategories && chosenCategories?.length > 0) {
            const isChosen = chosenCategories.some((category) => category.id === categoryId);
            setAlreadyChosen(isChosen);
        }
        if (chosenCategoriesId && chosenCategoriesId?.length > 0) {
            const isChosen = chosenCategoriesId.some((category) => category === categoryId);
            setAlreadyChosen(isChosen);
        }
    }, [chosenCategories, categoryId, chosenCategoriesId]);

    useEffect(() => {
        if (categoriesIdList?.length < 1) {
            setAlreadyChosen(false);
        }
    }, [categoriesIdList]);

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={alreadyChosen}
            onClick={handleToggle}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors duration-200 ${
                alreadyChosen
                    ? "border-transparent bg-accent-soft text-accent"
                    : "border-border text-text-2 hover:border-text-3/60 hover:text-text"
            }`}
        >
            <BeyouIcon id={iconId} size={13} />
            <span className="line-clamp-1">{name}</span>
        </button>
    );
}

export default CategoryItem;
