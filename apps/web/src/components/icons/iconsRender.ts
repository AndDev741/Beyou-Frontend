import i18next from "i18next";
import { IconObject } from "../../types/icons/IconObject";
import { searchIcons, normalizeIconId } from "./iconSearchIndex";

function iconRender(search: string, selectedIcon: string, icons: IconObject[] = []) {
    const locale = i18next.language || "en";
    const results = searchIcons({
        query: search,
        locale,
        category: "all",
        limit: 28
    });

    if (!results.length && icons.length) {
        return icons;
    }

    const selectedCanonical = normalizeIconId(selectedIcon);
    const withSelection = results.map((entry) => ({
        name: entry.id,
        IconComponent: entry.IconComponent,
        selected: entry.id === selectedCanonical
    }));

    return withSelection.map(({ name, IconComponent }) => ({ name, IconComponent }));
}

export default iconRender;
