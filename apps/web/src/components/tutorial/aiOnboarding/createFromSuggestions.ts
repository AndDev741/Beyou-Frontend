import { TFunction } from "i18next";
import { Dispatch } from "redux";
import createCategory from "@beyou/api/categories/createCategory";
import getCategories from "@beyou/api/categories/getCategories";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import { CategorySuggestion } from "@beyou/types/onboarding/suggestions";

export type CreatedRef = { id: string; name: string };

const BEGINNER = 0; // experienceToEnum(0) => 'BEGINNER'

/** Create accepted categories for real, refresh redux (app's create->refetch->dispatch pattern),
 *  and return name->id refs the later steps need. */
export async function createCategoriesFromSuggestions(
    suggestions: CategorySuggestion[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    for (const s of suggestions) {
        const res = await createCategory(s.name, s.description, BEGINNER, s.iconId, t);
        if (res.error) {
            const message = typeof res.error === "string" ? res.error : res.error.message;
            throw new Error(message ?? "create category failed");
        }
    }
    const all = await getCategories(t);
    if (all.error || !Array.isArray(all.success)) throw new Error("fetch categories failed");
    const list = all.success as Array<{ id: string; name: string }>;
    dispatch(enterCategories(all.success));
    const wanted = new Set(suggestions.map((s) => s.name));
    return list.filter((c) => wanted.has(c.name)).map((c) => ({ id: c.id, name: c.name }));
}
