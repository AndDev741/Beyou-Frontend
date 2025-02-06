import * as MdIcons from "react-icons/md";

function iconRender(search, selectedIcon, icons) {
  const iconArray = Object.keys(MdIcons).map((iconName) => ({
    name: iconName,
    IconComponent: MdIcons[iconName],
  }));

  let randomIcons =  icons || [];
  if(search?.length < 2 && selectedIcon === null){
    randomIcons = iconArray
    .sort(() => 0.5 - Math.random())
    .slice(0, 28);
  }

  let filteredIcons = [];
  if (search?.length >= 2) {
    filteredIcons = iconArray.filter((icon) => 
      icon.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  const iconsToDisplay = search?.length >= 2 ? filteredIcons : randomIcons;

  return iconsToDisplay;
}

export default iconRender;