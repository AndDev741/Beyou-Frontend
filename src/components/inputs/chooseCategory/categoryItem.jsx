import { useEffect, useState } from "react";
import iconSearch from "../../icons/iconsSearch";

function CategoryItem({name, iconId, categoryId, categoriesList, setCategoriesList, chosedCategory}){
    const [icon, setIcon] = useState(null);
    useEffect(() => {
        const result = iconSearch(iconId);
        setIcon(result[0]);
    }, [iconId])

    const handleCheckboxChange= (event) => {
        console.log(event.target.id)
        const {id, checked} = event.target;

        if(checked) {
            setCategoriesList([...categoriesList, id]);
        }else{
            setCategoriesList(categoriesList.filter((itemId) => itemId !== id));
        }
    }

    return(
        <div className="flex flex-col ite marker:ms-center mb-3">
            <input type="checkbox"
            checked={chosedCategory === categoryId}
            id={categoryId}
            name={name}
            onChange={handleCheckboxChange}
            className="border-0 w-full h-[25px] outline-none cursor-pointer" />
            <div className="flex items-center break-words">
                <p className="text-[30px] text-blueMain">
                    {icon !== null ? <icon.IconComponent/> : ""}
                </p>
                <label htmlFor={categoryId} 
                className="text-lg md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1">{name}</label>
            </div>
        </div>
    )
}

export default CategoryItem;