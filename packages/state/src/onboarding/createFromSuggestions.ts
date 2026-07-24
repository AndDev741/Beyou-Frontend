import { TFunction } from "i18next";
import { Dispatch } from "redux";
import createCategory from "@beyou/api/categories/createCategory";
import getCategories from "@beyou/api/categories/getCategories";
import createHabit from "@beyou/api/habits/createHabit";
import getHabits from "@beyou/api/habits/getHabits";
import createTask from "@beyou/api/tasks/createTask";
import getTasks from "@beyou/api/tasks/getTasks";
import createRoutine from "@beyou/api/routine/createRoutine";
import getRoutines from "@beyou/api/routine/getRoutines";
import createSchedule from "@beyou/api/schedule/createSchedule";
import createGoal from "@beyou/api/goals/createGoal";
import getGoals from "@beyou/api/goals/getGoals";
import { enterCategories } from "../category/categoriesSlice";
import { enterGoals } from "../goal/goalsSlice";
import { enterHabits } from "../habit/habitsSlice";
import { enterRoutines } from "../routine/routinesSlice";
import { enterTasks } from "../task/tasksSlice";
import { Routine } from "@beyou/types/routine/routine";
import {
    CategorySuggestion,
    GoalSuggestion,
    HabitSuggestion,
    RoutineSuggestion,
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

/** Create the accepted routine draft for real: resolve item names to the ids created
 *  in the previous step (unknown names are dropped — the AI may hallucinate items),
 *  re-fetch to learn the new routine's id, refresh redux, and schedule the days. */
export async function createRoutineFromSuggestion(
    suggestion: RoutineSuggestion,
    habits: CreatedRef[],
    tasks: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch
): Promise<{ routineId: string; name: string }> {
    const byName = (refs: CreatedRef[]) =>
        new Map(refs.map((r) => [r.name.toLowerCase(), r.id]));
    const habitIds = byName(habits);
    const taskIds = byName(tasks);

    const routine: Routine = {
        name: suggestion.name,
        iconId: suggestion.iconId,
        routineSections: suggestion.sections.map((s, i) => ({
            id: "",
            order: i,
            name: s.name,
            iconId: s.iconId,
            startTime: s.startTime,
            endTime: s.endTime,
            habitGroup: s.habits
                .filter((h) => habitIds.has(h.name.toLowerCase()))
                .map((h) => ({
                    habitId: habitIds.get(h.name.toLowerCase())!,
                    startTime: h.startTime,
                    endTime: h.endTime
                })),
            taskGroup: s.tasks
                .filter((item) => taskIds.has(item.name.toLowerCase()))
                .map((item) => ({
                    taskId: taskIds.get(item.name.toLowerCase())!,
                    startTime: item.startTime,
                    endTime: item.endTime
                }))
        }))
    };

    const res = await createRoutine(routine, t);
    if (res.error) throw new Error(res.error.message ?? "create routine failed");

    // The create response doesn't reliably carry the id -> re-fetch and match by
    // name (which also refreshes redux with the new routine).
    const all = await getRoutines(t);
    const list = all.success;
    if (all.error || !Array.isArray(list)) throw new Error("fetch routines failed");
    dispatch(enterRoutines(list));
    const created = list.find((r) => r.name === suggestion.name);
    if (!created?.id) throw new Error("created routine not found");

    if (suggestion.scheduleDays.length > 0) {
        const sched = await createSchedule(suggestion.scheduleDays, created.id, t);
        if (sched.error) throw new Error(sched.error.message ?? "create schedule failed");
    }
    return { routineId: created.id, name: suggestion.name };
}

/** How far out a goal's end date lands when the AI didn't provide a usable duration. */
const TERM_FALLBACK_DAYS = { SHORT_TERM: 30, MEDIUM_TERM: 90, LONG_TERM: 365 } as const;

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Create accepted goals starting today with an end date derived from `durationDays`
 *  (falling back per `term`), status NOT_STARTED and progress zero. */
export async function createGoalsFromSuggestions(
    suggestions: GoalSuggestion[],
    categories: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    if (suggestions.length === 0) return [];
    const today = new Date();
    for (const s of suggestions) {
        const categoryId = resolveCategoryId(s.categoryName, categories);
        const days = s.durationDays > 0 ? s.durationDays : TERM_FALLBACK_DAYS[s.term];
        const end = new Date(today);
        end.setDate(end.getDate() + days);
        const res = await createGoal(
            s.name,
            s.iconId,
            s.description,
            s.targetValue,
            s.unit,
            0,
            categoryId ? [categoryId] : [],
            s.motivation ?? "",
            toIsoDate(today),
            toIsoDate(end),
            "NOT_STARTED",
            s.term,
            t
        );
        if (res.error) throw new Error(res.error.message ?? "create goal failed");
    }
    const all = await getGoals(t);
    if (all.error || !Array.isArray(all.success)) throw new Error("fetch goals failed");
    dispatch(enterGoals(all.success));
    const wanted = new Set(suggestions.map((s) => s.name));
    return (all.success as Array<{ id: string; name: string }>)
        .filter((g) => wanted.has(g.name))
        .map((g) => ({ id: g.id, name: g.name }));
}

function resolveCategoryId(categoryName: string, categories: CreatedRef[]): string | undefined {
    return (
        categories.find((c) => c.name.toLowerCase() === categoryName?.toLowerCase()) ??
        categories[0]
    )?.id;
}
