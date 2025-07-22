import * as MdIcons from "react-icons/md";
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import { IconType } from "react-icons";
import { IconObject } from "../../types/icons/IconObject";

// Mapa de bibliotecas disponíveis
const ICON_SETS: Record<string, Record<string, IconType>> = {
  md: MdIcons,
  fa: FaIcons,
  ai: AiIcons,
};

function getAllIcons(): IconObject[] {
  const allIcons: IconObject[] = [];

  for (const [prefix, iconSet] of Object.entries(ICON_SETS)) {
    Object.keys(iconSet).forEach((iconName) => {
      const key = iconName as keyof typeof iconSet;
      allIcons.push({
        name: `${prefix}/${iconName}`, // Ex: "md/MdHome", "fa/FaBeer"
        IconComponent: iconSet[key],
      });
    });
  }

  return allIcons;
}

function iconSearch(name: string): IconObject | undefined {
  const allIcons = getAllIcons();

  return allIcons.find((icon) =>
    icon.name.toLowerCase().includes(name.toLowerCase())
  );
}

export default iconSearch;