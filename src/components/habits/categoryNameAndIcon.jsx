import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";

function CategoryNameAndIcon({icon, name}){
    const [iconComponent, setIconComponent] = useState();

    useEffect(() => {
        const response = iconSearch(icon);
        setIconComponent(response[0]);
    }, [])

    return(
        <div className="flex items-center">
            <p className="text-[20px] text-blueMain">
                {iconComponent != null ? <iconComponent.IconComponent /> : "."}
            </p>
            <p className="ml-1">{name}</p>
        </div>
    )
}

export default CategoryNameAndIcon;