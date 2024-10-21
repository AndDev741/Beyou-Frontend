import * as MdIcons from "react-icons/md";

function iconSearch(iconName){
    const iconArray = Object.keys(MdIcons).map((iconName) => ({
        name: iconName,
        IconComponent: MdIcons[iconName],
    }));

    const icon = iconArray.filter((icon) => 
        icon.name.toLowerCase().includes(iconName.toLowerCase()));

    return icon;
}

export default iconSearch;