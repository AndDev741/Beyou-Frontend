import { useEffect, useState } from "react";
import iconSearch from "../icons/iconsSearch";

function HabitBox({iconId, name}){

    const [icon, setIcon] = useState(null);

    useEffect(() => {
        const response = iconSearch(iconId);
        setIcon(response[0]);
    })

    return(
        <div className="w-[200px] h-[100px] border-blueMain border-[1px] rounded-md">
            <div className="flex items-center p-2">
                {icon != null ? <icon.IconComponent /> : ""}
                <h2 className="ml-2">{name}</h2>
            </div>
        </div>
    )
}

export default HabitBox;