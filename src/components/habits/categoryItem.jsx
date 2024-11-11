import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";

function CategoryItem({name, iconId}){
    const [icon, setIcon] = useState(null);
    useEffect(() => {
        const result = iconSearch(iconId);
        setIcon(result[0]);
    }, [])

    return(
        <div className="flex flex-col items-center mb-12 ">
            <input type="checkbox"
            id={iconId}
            name={iconId}
            className="border-0 w-full h-[25px] outline-none" />
            <div className="flex items-center break-words">
                <p className="text-[30px] text-blueMain">
                    {icon !== null ? <icon.IconComponent/> : ""}
                </p>
                <label htmlFor={iconId} 
                className="text-lg md:text-xl font-semibold ml-1 max-w-[27vw] md:max-w-[220px] lg:max-w-[150px] line-clamp-1">{name}</label>
            </div>
        </div>
    )
}

export default CategoryItem;