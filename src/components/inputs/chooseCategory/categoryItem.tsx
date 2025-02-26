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
    chosenCategories: category[] | null
}

function CategoryItem({name, iconId, categoryId, categoriesIdList, setCategoriesIdList, chosenCategories}: categoryItemProps){
    const [Icon, setIcon] = useState<IconObject>();
    const [alreadyChosen, setAlreadyChosen] = useState(false);

    useEffect(() => {
        const result = iconSearch(iconId);
        setIcon(result);
    }, [iconId])

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
    }, [chosenCategories, categoryId])

    return(
        <div className="flex flex-col ite marker:ms-center mb-3">
            <input type="checkbox"
            checked={alreadyChosen}
            id={categoryId}
            name={name}
            onChange={handleCheckboxChange}
            className="border-0 w-full h-[25px] outline-none cursor-pointer" />
            <div className="flex items-center break-words">
                <p className="text-[30px] text-blueMain">
                    {Icon !== undefined ? <Icon.IconComponent/> : null}
                </p>
                <label htmlFor={categoryId} 
                className={`${chosenCategories && chosenCategories[0] !== undefined && chosenCategories[0].id === categoryId ? "text-blueMain" : ""} text-lg md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1`}>{name}</label>
            </div>
        </div>
    )
}

export default CategoryItem;