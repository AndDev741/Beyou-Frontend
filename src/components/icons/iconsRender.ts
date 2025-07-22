import * as MdIcons from "react-icons/md";
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import { IconType } from "react-icons";
import { IconObject } from "../../types/icons/IconObject";

// Mapeia os conjuntos de ícones disponíveis
const ICON_SETS: Record<string, Record<string, IconType>> = {
  md: MdIcons,
  fa: FaIcons,
  ai: AiIcons,
};

// Gera a lista combinada de ícones com base nas bibliotecas disponíveis
function getAllIcons(): IconObject[] {
  const allIcons: IconObject[] = [];

  for (const [prefix, icons] of Object.entries(ICON_SETS)) {
    for (const iconName of Object.keys(icons)) {
      allIcons.push({
        name: `${iconName}`, // Ex: "md/MdAlarm" ou "fa/FaBeer"
        IconComponent: icons[iconName as keyof typeof icons],
      });
    }
  }

  return allIcons;
}

function iconRender(search: string, selectedIcon: string, icons: IconObject[] = []) {
  const iconArray: IconObject[] = getAllIcons();

  let randomIcons = icons || [];

  if (search?.length < 2 && selectedIcon === "") {
    randomIcons = iconArray.sort(() => 0.5 - Math.random()).slice(0, 28);
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
