import { IconObject } from "../../types/icons/IconObject";
import { getIconObjectById } from "./iconRegistry";

function iconSearch(name: string): IconObject | undefined {
    return getIconObjectById(name);
}

export default iconSearch;
