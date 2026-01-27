import { useEffect, useState } from "react";
import iconSearch from "../../icons/iconsSearch";
import { IconObject } from "../../../types/icons/IconObject";
import category from "../../../types/category/categoryType";

type categoryItemProps = {
    name: string,
    iconId: string,
    categoryId: string,
    categoriesIdList: string[],
    setCategoriesIdList: React.Dispatch<React.SetStateAction<string[]>>,
    chosenCategories?: category[] | null
    chosenCategoriesId?: string[]
}

function CategoryItem({name, iconId, categoryId, categoriesIdList, setCategoriesIdList, chosenCategories, chosenCategoriesId}: categoryItemProps){
    const [Icon, setIcon] = useState<IconObject>();
    const [alreadyChosen, setAlreadyChosen] = useState(false);
    useEffect(() => {
        const result = iconSearch(iconId);
        setIcon(result);
    }, [iconId])
    console.log(`NAME =? ${name} checked? ${alreadyChosen}`)
    const handleCheckboxChange= (event: { target: { id: string; checked: boolean; }; }) => {
        const {id, checked} = event.target;

        if(checked) {
            setAlreadyChosen(true);
            setCategoriesIdList([...categoriesIdList, id]);
        }else{
            setAlreadyChosen(false);
            setCategoriesIdList(categoriesIdList.filter((itemId) => itemId !== id));
        }
    }

    useEffect(() => {
        if(chosenCategories && chosenCategories?.length > 0){
            const isChosen = chosenCategories.some((category) => category.id === categoryId)
            setAlreadyChosen(isChosen)
        }
        if(chosenCategoriesId && chosenCategoriesId?.length > 0){
            const isChosen = chosenCategoriesId.some((category) => category === categoryId)
            setAlreadyChosen(isChosen)
        }
    }, [chosenCategories, categoryId, chosenCategoriesId])

    useEffect(() => {
        if(categoriesIdList?.length < 1){
            setAlreadyChosen(false);
        }
    }, [categoriesIdList])

    const isChosen = alreadyChosen;
    const labelClasses = `relative flex flex-col items-start p-1 my-2 mx-1 w-full cursor-pointer max-w-[43vw] md:max-w-[180px] border-2 border-primary rounded-md bg-background text-secondary transition-colors duration-200
        ${isChosen ? "bg-primary text-white" : ""} 
        ${alreadyChosen ? "bg-primary text-white" : ""}`;
    
    const iconClasses = `min-w-[30px] text-[30px] text-icon 
        ${isChosen ? "text-white" : ""} 
        ${alreadyChosen ? "text-white" : ""}`;
    
    return (
        <label htmlFor={categoryId} className={labelClasses}>
            <input
                type="checkbox"
                checked={alreadyChosen}
                id={categoryId}
                name={name}
                onChange={handleCheckboxChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex items-start w-full">
                {Icon?.IconComponent && <Icon.IconComponent className={iconClasses} />}
                <p className="text-lg md:text-xl font-semibold ml-1 line-clamp-2">
                    {name}
                </p>
            </div>
        </label>
    );
}

export default CategoryItem;
