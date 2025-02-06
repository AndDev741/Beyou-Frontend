import { useEffect, useState } from "react";
import iconSearch from "../../icons/iconsSearch";

function CategoryItem({name, iconId, categoryId, categoriesList, setCategoriesList, categoryChosed}){
    const [icon, setIcon] = useState(null);
    const [alreadyChosen, setAlreadyChosen] = useState(false);

    useEffect(() => {
        const result = iconSearch(iconId);
        setIcon(result[0]);
    }, [iconId])

    const handleCheckboxChange= (event) => {
        const {id, checked} = event.target;

        if(checked) {
            setAlreadyChosen(true);
            setCategoriesList([...categoriesList, id]);
        }else{
            setAlreadyChosen(false);
            setCategoriesList(categoriesList.filter((itemId) => itemId !== id));
        }
    }

    useEffect(() => {
        if(categoryChosed?.length > 0){
            const isChosen = categoryChosed.some((category) => category.id === categoryId)
            setAlreadyChosen(isChosen)
        }
    }, [categoryChosed, categoryId])

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
                    {icon !== null ? <icon.IconComponent/> : ""}
                </p>
                <label htmlFor={categoryId} 
                className={`${categoryChosed?.id === categoryId ? "text-blueMain" : ""} text-lg md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1`}>{name}</label>
            </div>
        </div>
    )
}

export default CategoryItem;