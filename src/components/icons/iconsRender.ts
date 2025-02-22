import * as MdIcons from "react-icons/md";
import { IconType } from "react-icons";
import { IconName } from "../../types/icons/IconName";
import { IconObject } from "../../types/icons/IconComponent";



function iconRender(search: string, selectedIcon: string, icons: IconObject[] = []) {
  const iconArray: IconObject[] = Object.keys(MdIcons).map((iconName) => ({
    name: iconName as IconName,
    iconComponent: MdIcons[iconName as IconName] as IconType,
  }));

  let randomIcons =  icons || [];

  if(search?.length < 2 && selectedIcon === ""){
    randomIcons = iconArray
    .sort(() => 0.5 - Math.random())
    .slice(0, 28);
  }

  let filteredIcons: IconObject[] = [];
  if (search?.length >= 2) {
    filteredIcons = iconArray.filter((icon) => 
      icon.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  const iconsToDisplay = search?.length >= 2 ? filteredIcons : randomIcons;

  return iconsToDisplay;
}

export default iconRender;