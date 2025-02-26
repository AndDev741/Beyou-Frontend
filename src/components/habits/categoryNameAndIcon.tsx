import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";
import { IconObject } from "../../types/icons/IconObject";

type categoryNameAndIconProps = {
    iconId: string,
    name: string
}

function CategoryNameAndIcon({iconId, name}: categoryNameAndIconProps){
    const [IconComponent, setIconComponent] = useState<IconObject>();

    useEffect(() => {
        const response = iconSearch(iconId);
        setIconComponent(response);
    }, [])

    console.log("teste")
    return(
        <div className="flex items-center">
            <p className="text-[20px] text-blueMain">
                {IconComponent !== undefined ? <IconComponent.IconComponent/> : null}
            </p>
            <p className="ml-1">{name}</p>
        </div>
    )
}

export default CategoryNameAndIcon;