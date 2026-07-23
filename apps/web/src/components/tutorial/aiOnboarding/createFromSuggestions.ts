import { TFunction } from "i18next";
import { Dispatch } from "redux";
import createCategory from "@beyou/api/categories/createCategory";
import getCategories from "@beyou/api/categories/getCategories";
import createHabit from "@beyou/api/habits/createHabit";
import getHabits from "@beyou/api/habits/getHabits";
import createTask from "@beyou/api/tasks/createTask";
import getTasks from "@beyou/api/tasks/getTasks";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import {
    CategorySuggestion,
    HabitSuggestion,
    TaskSuggestion
} from "@beyou/types/onboarding/suggestions";

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

/** Create accepted habits, mapping the suggestion's `difficulty` onto the API's
 *  misspelled `dificulty` parameter and `categoryName` onto a created category id. */
export async function createHabitsFromSuggestions(
    suggestions: HabitSuggestion[],
    categories: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    if (suggestions.length === 0) return [];
    for (const s of suggestions) {
        const categoryId = resolveCategoryId(s.categoryName, categories);
        const res = await createHabit(
            s.name,
            s.description,
            s.motivationalPhrase ?? "",
            s.importance,
            s.difficulty,
            s.iconId,
            BEGINNER,
            categoryId ? [categoryId] : [],
            t
        );
        if (res.error) throw new Error(res.error.message ?? "create habit failed");
    }
    const all = await getHabits(t);
    if (all.error || !Array.isArray(all.success)) throw new Error("fetch habits failed");
    dispatch(enterHabits(all.success));
    const wanted = new Set(suggestions.map((s) => s.name));
    return (all.success as Array<{ id: string; name: string }>)
        .filter((h) => wanted.has(h.name))
        .map((h) => ({ id: h.id, name: h.name }));
}

/** Create accepted tasks (never one-time here — onboarding tasks are recurring pool items). */
export async function createTasksFromSuggestions(
    suggestions: TaskSuggestion[],
    categories: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    if (suggestions.length === 0) return [];
    for (const s of suggestions) {
        const categoryId = resolveCategoryId(s.categoryName, categories);
        const res = await createTask(
            s.name,
            s.description,
            s.iconId,
            categoryId ? [categoryId] : [],
            t,
            s.importance,
            s.difficulty,
            false
        );
        if (res.error) throw new Error(res.error.message ?? "create task failed");
    }
    const all = await getTasks(t);
    if (all.error || !Array.isArray(all.success)) throw new Error("fetch tasks failed");
    dispatch(enterTasks(all.success));
    const wanted = new Set(suggestions.map((s) => s.name));
    return (all.success as Array<{ id: string; name: string }>)
        .filter((task) => wanted.has(task.name))
        .map((task) => ({ id: task.id, name: task.name }));
}

function resolveCategoryId(categoryName: string, categories: CreatedRef[]): string | undefined {
    return (
        categories.find((c) => c.name.toLowerCase() === categoryName?.toLowerCase()) ??
        categories[0]
    )?.id;
}
