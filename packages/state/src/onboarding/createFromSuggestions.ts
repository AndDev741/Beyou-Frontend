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

/** A row as it comes back from the server: the id, and the name it is matched by. */
type NamedRow = { id: string; name: string };

/** Trimmed and case-insensitive, because the model does not reproduce its own
 *  capitalisation between two calls and a second pass still has to recognise the
 *  rows the first one left behind. */
const nameKey = (name: string) => name.trim().toLowerCase();

function indexByName(rows: NamedRow[]): Map<string, NamedRow> {
    const index = new Map<string, NamedRow>();
    for (const row of rows) {
        const key = nameKey(row.name);
        // First one wins: an account that already collected duplicates before this
        // existed resolves to one of them rather than throwing.
        if (!index.has(key)) index.set(key, row);
    }
    return index;
}

/** A ref per suggestion, in the order they were offered, each carrying the server's
 *  id. A name with no row behind it is dropped rather than guessed at. */
function refsFor(names: string[], rows: NamedRow[]): CreatedRef[] {
    const index = indexByName(rows);
    const refs: CreatedRef[] = [];
    const taken = new Set<string>();
    for (const name of names) {
        const key = nameKey(name);
        const row = index.get(key);
        if (!row || taken.has(key)) continue;
        taken.add(key);
        refs.push({ id: row.id, name: row.name });
    }
    return refs;
}

async function listOrThrow(
    fetching: Promise<Record<string, unknown>>,
    label: string
): Promise<NamedRow[]> {
    const res = await fetching;
    if (res.error || !Array.isArray(res.success)) throw new Error(`fetch ${label} failed`);
    return res.success as NamedRow[];
}

/**
 * Create the suggestions this account does not already hold, and hand back a ref for
 * every one of them.
 *
 * Each step used to create in a loop and only report its refs once the last create
 * had landed, so a failure partway through left rows behind that nothing had
 * recorded. The error banner's Try again then re-ran the step from the top and added
 * another full copy of whatever had already succeeded, and nothing downstream was
 * going to notice: neither the API nor the schema minds two habits under the same
 * name. An account that accepted three habits and pressed that button enough times
 * came out holding fifty-eight.
 *
 * Reading the server first is what makes the second pass a no-op. It deliberately
 * does not consult the wizard's own record of what it built, because that record is
 * exactly what a mid-loop failure never got to write, and it is gone anyway after a
 * reload. Keep the check here rather than at the four call sites: web and mobile both
 * come through this module, and a fifth step added later cannot forget it.
 */
async function createMissing<S extends { name: string }>(
    suggestions: S[],
    list: () => Promise<NamedRow[]>,
    create: (suggestion: S) => Promise<void>,
    publish: (rows: NamedRow[]) => void
): Promise<CreatedRef[]> {
    if (suggestions.length === 0) return [];
    const before = await list();
    const held = indexByName(before);
    const missing = suggestions.filter((s) => !held.has(nameKey(s.name)));
    for (const suggestion of missing) {
        await create(suggestion);
    }
    // Nothing created means the list already in hand is current.
    const after = missing.length > 0 ? await list() : before;
    publish(after);
    return refsFor(
        suggestions.map((s) => s.name),
        after
    );
}

/** Create accepted categories for real, refresh redux (app's create->refetch->dispatch pattern),
 *  and return name->id refs the later steps need. */
export async function createCategoriesFromSuggestions(
    suggestions: CategorySuggestion[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    return createMissing(
        suggestions,
        () => listOrThrow(getCategories(t), "categories"),
        async (s) => {
            const res = await createCategory(s.name, s.description, BEGINNER, s.iconId, t);
            if (res.error) {
                const message = typeof res.error === "string" ? res.error : res.error.message;
                throw new Error(message ?? "create category failed");
            }
        },
        (rows) => dispatch(enterCategories(rows))
    );
}

/** Create accepted habits, mapping the suggestion's `difficulty` onto the API's
 *  misspelled `dificulty` parameter and `categoryName` onto a created category id. */
export async function createHabitsFromSuggestions(
    suggestions: HabitSuggestion[],
    categories: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    return createMissing(
        suggestions,
        () => listOrThrow(getHabits(t), "habits"),
        async (s) => {
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
        },
        (rows) => dispatch(enterHabits(rows))
    );
}

/** Create accepted tasks (never one-time here — onboarding tasks are recurring pool items). */
export async function createTasksFromSuggestions(
    suggestions: TaskSuggestion[],
    categories: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch
): Promise<CreatedRef[]> {
    return createMissing(
        suggestions,
        () => listOrThrow(getTasks(t), "tasks"),
        async (s) => {
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
        },
        (rows) => dispatch(enterTasks(rows))
    );
}

/**
 * Create the accepted routine draft for real.
 *
 * Anything in `newHabits` / `newTasks` is created first, because a placement can only
 * be resolved against something that exists — the plan refers to every item by name,
 * and a name with no id behind it is dropped. That dropping is still here as the last
 * line of defence against a hallucinated name, but it is no longer how a routine loses
 * a step: the assistant can now fill a gap in the day by describing the item, and this
 * is what turns that description into a row before the routine reaches for it.
 *
 * The ids of what it created come back with the routine, so the wizard can record them
 * alongside everything else it made and a resumed session does not build them twice.
 */
export async function createRoutineFromSuggestion(
    suggestion: RoutineSuggestion,
    habits: CreatedRef[],
    tasks: CreatedRef[],
    t: TFunction,
    dispatch: Dispatch,
    categories: CreatedRef[] = []
): Promise<{ routineId: string; name: string; newHabits: CreatedRef[]; newTasks: CreatedRef[] }> {
    // Only the ones that are genuinely new. A model asked not to restate an existing
    // item will sometimes restate it anyway. What the account already holds is checked
    // again inside the create helpers, against the server; this pass reads the refs the
    // wizard is carrying, which is enough to skip the round trip and to keep the
    // newHabits/newTasks it reports back to just what this step added.
    const known = (refs: CreatedRef[]) => new Set(refs.map((r) => r.name.toLowerCase()));
    const knownHabits = known(habits);
    const knownTasks = known(tasks);

    const habitsToCreate = (suggestion.newHabits ?? []).filter(
        (h) => h.name && !knownHabits.has(h.name.toLowerCase())
    );
    const tasksToCreate = (suggestion.newTasks ?? []).filter(
        (item) => item.name && !knownTasks.has(item.name.toLowerCase())
    );

    const createdHabits = await createHabitsFromSuggestions(habitsToCreate, categories, t, dispatch);
    const createdTasks = await createTasksFromSuggestions(tasksToCreate, categories, t, dispatch);

    const byName = (refs: CreatedRef[]) =>
        new Map(refs.map((r) => [r.name.toLowerCase(), r.id]));
    const habitIds = byName([...habits, ...createdHabits]);
    const taskIds = byName([...tasks, ...createdTasks]);

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

    // A retry arrives here with the routine from the failed pass already saved: the
    // create runs before the schedule, so a failure after it leaves a routine behind
    // under this name. Reuse that one instead of saving a second.
    const existing = await listOrThrow(getRoutines(t), "routines");
    const key = nameKey(suggestion.name);
    let list = existing;
    if (!existing.some((r) => nameKey(r.name) === key)) {
        const res = await createRoutine(routine, t);
        if (res.error) throw new Error(res.error.message ?? "create routine failed");
        // The create response doesn't reliably carry the id -> re-fetch and match by
        // name (which also refreshes redux with the new routine).
        list = await listOrThrow(getRoutines(t), "routines");
    }
    dispatch(enterRoutines(list));
    const created = list.find((r) => nameKey(r.name) === key);
    if (!created?.id) throw new Error("created routine not found");

    if (suggestion.scheduleDays.length > 0) {
        // Safe to repeat: POST /schedule replaces whatever the routine was scheduled
        // with rather than adding a row, so a retry re-scheduling is a no-op.
        const sched = await createSchedule(suggestion.scheduleDays, created.id, t);
        if (sched.error) throw new Error(sched.error.message ?? "create schedule failed");
    }
    return {
        routineId: created.id,
        name: suggestion.name,
        newHabits: createdHabits,
        newTasks: createdTasks
    };
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
    const today = new Date();
    return createMissing(
        suggestions,
        () => listOrThrow(getGoals(t), "goals"),
        async (s) => {
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
        },
        (rows) => dispatch(enterGoals(rows))
    );
}

function resolveCategoryId(categoryName: string, categories: CreatedRef[]): string | undefined {
    return (
        categories.find((c) => c.name.toLowerCase() === categoryName?.toLowerCase()) ??
        categories[0]
    )?.id;
}
