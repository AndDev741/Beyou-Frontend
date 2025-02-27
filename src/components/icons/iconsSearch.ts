import * as MdIcons from "react-icons/md";
import { IconName } from "../../types/icons/IconName";
import { IconType } from "react-icons";
import { IconObject } from "../../types/icons/IconObject";

function iconSearch(name: string){
    const iconArray: IconObject[] = Object.keys(MdIcons).map((iconName) => ({
        name: iconName as IconName,
        IconComponent: MdIcons[iconName as IconName] as IconType,
    }));

    const icon = iconArray.filter((icon) => 
        icon.name.toLowerCase().includes(name.toLowerCase()));

    return icon[0];
}

export default iconSearch;