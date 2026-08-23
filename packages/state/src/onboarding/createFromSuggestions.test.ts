import { describe, test, expect, vi, beforeEach, type Mock } from "vitest";

const createCategory = vi.fn();
const getCategories = vi.fn();
vi.mock("@beyou/api/categories/createCategory", () => ({ default: (...a: unknown[]) => createCategory(...a) }));
vi.mock("@beyou/api/categories/getCategories", () => ({ default: (...a: unknown[]) => getCategories(...a) }));

const createHabit = vi.fn();
const getHabits = vi.fn();
vi.mock("@beyou/api/habits/createHabit", () => ({ default: (...a: unknown[]) => createHabit(...a) }));
vi.mock("@beyou/api/habits/getHabits", () => ({ default: (...a: unknown[]) => getHabits(...a) }));

const createTask = vi.fn();
const getTasks = vi.fn();
vi.mock("@beyou/api/tasks/createTask", () => ({ default: (...a: unknown[]) => createTask(...a) }));
vi.mock("@beyou/api/tasks/getTasks", () => ({ default: (...a: unknown[]) => getTasks(...a) }));

const createRoutine = vi.fn();
const getRoutines = vi.fn();
const createSchedule = vi.fn();
vi.mock("@beyou/api/routine/createRoutine", () => ({ default: (...a: unknown[]) => createRoutine(...a) }));
vi.mock("@beyou/api/routine/getRoutines", () => ({ default: (...a: unknown[]) => getRoutines(...a) }));
vi.mock("@beyou/api/schedule/createSchedule", () => ({ default: (...a: unknown[]) => createSchedule(...a) }));

const createGoal = vi.fn();
const getGoals = vi.fn();
vi.mock("@beyou/api/goals/createGoal", () => ({ default: (...a: unknown[]) => createGoal(...a) }));
vi.mock("@beyou/api/goals/getGoals", () => ({ default: (...a: unknown[]) => getGoals(...a) }));

import { SuggestionCreateError } from "./SuggestionCreateError";
import {
  createCategoriesFromSuggestions,
  createGoalsFromSuggestions,
  createHabitsFromSuggestions,
  createTasksFromSuggestions,
  createRoutineFromSuggestion
} from "./createFromSuggestions";

const t = ((k: string) => k) as never;

/**
 * Answer a list getter with each page in turn, repeating the last one after that.
 *
 * Every create helper now reads the server before it writes, so a step that creates
 * two rows fetches twice: once to see what is missing, once to pick up the ids. The
 * first page is what the account held before the step ran.
 */
const armList = (mock: Mock, ...pages: unknown[][]) => {
  pages.slice(0, -1).forEach((page) => mock.mockResolvedValueOnce({ success: page }));
  mock.mockResolvedValue({ success: pages[pages.length - 1] });
};

describe("createCategoriesFromSuggestions", () => {
  beforeEach(() => { createCategory.mockReset(); getCategories.mockReset(); });

  test("creates each suggestion, re-fetches, dispatches, returns id refs", async () => {
    createCategory.mockResolvedValue({ success: {} });
    armList(getCategories, [], [
      { id: "id-1", name: "Health" }, { id: "id-2", name: "Career" }
    ]);
    const dispatch = vi.fn();

    const refs = await createCategoriesFromSuggestions(
      [{ name: "Health", description: "d", iconId: "lucide:star" },
       { name: "Career", description: "d2", iconId: "lucide:star" }], t, dispatch);

    expect(createCategory).toHaveBeenCalledTimes(2);
    expect(createCategory).toHaveBeenCalledWith("Health", "d", 0, "lucide:star", t);
    expect(dispatch).toHaveBeenCalled(); // enterCategories with the fetched list
    expect(refs).toEqual([{ id: "id-1", name: "Health" }, { id: "id-2", name: "Career" }]);
  });

  test("throws when a create fails so the wizard can show retry", async () => {
    armList(getCategories, []);
    createCategory.mockResolvedValue({ error: { message: "nope" } });
    await expect(createCategoriesFromSuggestions(
      [{ name: "Health", description: "d", iconId: "lucide:star" }], t, vi.fn()
    )).rejects.toThrow();
  });
});

describe("createHabitsFromSuggestions", () => {
  beforeEach(() => { createHabit.mockReset(); getHabits.mockReset(); });

  test("creates habits resolving categoryName to id, maps difficulty->dificulty arg", async () => {
    createHabit.mockResolvedValue({ success: {} });
    armList(getHabits, [], [{ id: "h-1", name: "Run" }]);
    const refs = await createHabitsFromSuggestions(
      [{ name: "Run", description: "d", motivationalPhrase: "go", iconId: "lucide:zap",
         categoryName: "Health", importance: 4, difficulty: 2 }],
      [{ id: "cat-1", name: "Health" }], t, vi.fn());
    // signature: name, desc, motivationalPhrase, importance, dificulty, iconId, experience, categoriesId, t
    expect(createHabit).toHaveBeenCalledWith("Run", "d", "go", 4, 2, "lucide:zap", 0, ["cat-1"], t);
    expect(refs).toEqual([{ id: "h-1", name: "Run" }]);
  });

  test("unknown categoryName falls back to first category", async () => {
    createHabit.mockResolvedValue({ success: {} });
    armList(getHabits, [], [{ id: "h-1", name: "Run" }]);
    await createHabitsFromSuggestions(
      [{ name: "Run", description: "d", motivationalPhrase: "", iconId: "lucide:zap",
         categoryName: "Nope", importance: 3, difficulty: 3 }],
      [{ id: "cat-1", name: "Health" }], t, vi.fn());
    expect(createHabit).toHaveBeenCalledWith("Run", "d", "", 3, 3, "lucide:zap", 0, ["cat-1"], t);
  });

  test("throws when a create fails so the wizard can show retry", async () => {
    armList(getHabits, []);
    createHabit.mockResolvedValue({ error: { message: "nope" } });
    await expect(createHabitsFromSuggestions(
      [{ name: "Run", description: "d", motivationalPhrase: "", iconId: "lucide:zap",
         categoryName: "Health", importance: 3, difficulty: 3 }],
      [{ id: "cat-1", name: "Health" }], t, vi.fn()
    )).rejects.toThrow();
  });
});

describe("createTasksFromSuggestions", () => {
  beforeEach(() => { createTask.mockReset(); getTasks.mockReset(); });

  test("creates tasks resolving categoryName to id, re-fetches, dispatches, returns refs", async () => {
    createTask.mockResolvedValue({ success: {} });
    armList(getTasks, [], [{ id: "t-1", name: "Buy shoes" }]);
    const dispatch = vi.fn();
    const refs = await createTasksFromSuggestions(
      [{ name: "Buy shoes", description: "d", iconId: "lucide:zap",
         categoryName: "Health", importance: 3, difficulty: 3 }],
      [{ id: "cat-1", name: "Health" }], t, dispatch);
    // signature: name, description, iconId, categoriesId, t, importance?, difficulty?, oneTimeTask?
    expect(createTask).toHaveBeenCalledWith("Buy shoes", "d", "lucide:zap", ["cat-1"], t, 3, 3, false);
    expect(dispatch).toHaveBeenCalled(); // enterTasks with the fetched list
    expect(refs).toEqual([{ id: "t-1", name: "Buy shoes" }]);
  });

  test("throws when a create fails so the wizard can show retry", async () => {
    armList(getTasks, []);
    createTask.mockResolvedValue({ error: { message: "nope" } });
    await expect(createTasksFromSuggestions(
      [{ name: "Buy shoes", description: "d", iconId: "lucide:zap",
         categoryName: "Health", importance: 3, difficulty: 3 }],
      [{ id: "cat-1", name: "Health" }], t, vi.fn()
    )).rejects.toThrow();
  });
});

describe("createRoutineFromSuggestion", () => {
  beforeEach(() => { createRoutine.mockReset(); getRoutines.mockReset(); createSchedule.mockReset(); });

  test("builds Routine from suggestion resolving item names to ids, schedules it", async () => {
    createRoutine.mockResolvedValue({ success: {} });
    armList(getRoutines, [], [{ id: "r-1", name: "Morning flow" }]);
    createSchedule.mockResolvedValue({ success: {} });

    const result = await createRoutineFromSuggestion(
      { name: "Morning flow", iconId: "lucide:sun", scheduleDays: ["Monday"],
        sections: [{ name: "Wake", iconId: "lucide:sun", startTime: "07:00", endTime: "08:00",
          habits: [{ name: "Run", startTime: "07:00", endTime: "07:30" }],
          tasks: [{ name: "Ghost task", startTime: "07:30", endTime: "07:40" }] }] },
      [{ id: "h-1", name: "Run" }], [], t, vi.fn());

    const routineArg = createRoutine.mock.calls[0][0];
    expect(routineArg.name).toBe("Morning flow");
    expect(routineArg.routineSections[0].habitGroup).toEqual(
      [{ habitId: "h-1", startTime: "07:00", endTime: "07:30" }]);
    expect(routineArg.routineSections[0].taskGroup).toEqual([]); // unknown names dropped
    expect(createSchedule).toHaveBeenCalledWith(["Monday"], "r-1", t);
    expect(result).toEqual({
      routineId: "r-1", name: "Morning flow", newHabits: [], newTasks: []
    });
  });

  test("dispatches the re-fetched routines into redux", async () => {
    createRoutine.mockResolvedValue({ success: {} });
    armList(getRoutines, [], [{ id: "r-1", name: "Morning flow" }]);
    createSchedule.mockResolvedValue({ success: {} });
    const dispatch = vi.fn();

    await createRoutineFromSuggestion(
      { name: "Morning flow", iconId: "lucide:sun", scheduleDays: [],
        sections: [] },
      [], [], t, dispatch);

    expect(dispatch).toHaveBeenCalled(); // enterRoutines with the fetched list
    expect(createSchedule).not.toHaveBeenCalled(); // no days selected -> no schedule
  });

  test("throws when the create fails so the wizard can show retry", async () => {
    armList(getRoutines, []);
    createRoutine.mockResolvedValue({ error: { message: "nope" } });
    await expect(createRoutineFromSuggestion(
      { name: "Morning flow", iconId: "lucide:sun", scheduleDays: [], sections: [] },
      [], [], t, vi.fn()
    )).rejects.toThrow();
  });
});

describe("createGoalsFromSuggestions", () => {
  beforeEach(() => { createGoal.mockReset(); getGoals.mockReset(); });

  test("creates goals with dates derived from durationDays, status NOT_STARTED, currentValue 0", async () => {
    createGoal.mockResolvedValue({ success: {} });
    armList(getGoals, [], [{ id: "g-1", name: "Read 12 books" }]);
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-23"));

    try {
      const refs = await createGoalsFromSuggestions(
        [{ name: "Read 12 books", description: "d", iconId: "lucide:book-open", categoryName: "Reading",
           targetValue: 12, unit: "books", motivation: "grow", term: "LONG_TERM", durationDays: 365 }],
        [{ id: "cat-r", name: "Reading" }], t, vi.fn());

      expect(createGoal).toHaveBeenCalledWith("Read 12 books", "lucide:book-open", "d", 12, "books",
        0, ["cat-r"], "grow", "2026-07-23", "2027-07-23", "NOT_STARTED", "LONG_TERM", t);
      expect(refs).toEqual([{ id: "g-1", name: "Read 12 books" }]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("falls back to term-based duration when durationDays is not positive", async () => {
    createGoal.mockResolvedValue({ success: {} });
    armList(getGoals, [], [{ id: "g-1", name: "Save money" }]);
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-23"));

    try {
      await createGoalsFromSuggestions(
        [{ name: "Save money", description: "d", iconId: "lucide:piggy-bank", categoryName: "Finances",
           targetValue: 500, unit: "USD", motivation: null, term: "SHORT_TERM", durationDays: 0 }],
        [{ id: "cat-f", name: "Finances" }], t, vi.fn());

      // SHORT_TERM fallback = 30 days; null motivation becomes ""
      expect(createGoal).toHaveBeenCalledWith("Save money", "lucide:piggy-bank", "d", 500, "USD",
        0, ["cat-f"], "", "2026-07-23", "2026-08-22", "NOT_STARTED", "SHORT_TERM", t);
    } finally {
      vi.useRealTimers();
    }
  });

  test("skips API calls entirely for an empty selection", async () => {
    const dispatch = vi.fn();
    const refs = await createGoalsFromSuggestions([], [], t, dispatch);
    expect(refs).toEqual([]);
    expect(createGoal).not.toHaveBeenCalled();
    expect(getGoals).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("throws when a create fails so the wizard can show retry", async () => {
    armList(getGoals, []);
    createGoal.mockResolvedValue({ error: { message: "nope" } });
    await expect(createGoalsFromSuggestions(
      [{ name: "Read 12 books", description: "d", iconId: "lucide:book-open", categoryName: "Reading",
         targetValue: 12, unit: "books", motivation: "grow", term: "LONG_TERM", durationDays: 365 }],
      [{ id: "cat-r", name: "Reading" }], t, vi.fn()
    )).rejects.toThrow();
  });
});

describe("createRoutineFromSuggestion with items the user does not have yet", () => {
  beforeEach(() => {
    createRoutine.mockReset(); getRoutines.mockReset(); createSchedule.mockReset();
    createHabit.mockReset(); getHabits.mockReset();
    createTask.mockReset(); getTasks.mockReset();
  });

  const draft = (extra: Record<string, unknown>) => ({
    name: "Morning flow", iconId: "lucide:sun", scheduleDays: ["Monday"],
    sections: [{
      name: "Wake", iconId: "lucide:sun", startTime: "07:00", endTime: "08:00",
      habits: [{ name: "Stretch", startTime: "07:00", endTime: "07:15" }],
      tasks: [{ name: "Buy a mat", startTime: "07:15", endTime: "07:20" }]
    }],
    ...extra
  });

  const armRoutine = () => {
    createRoutine.mockResolvedValue({ success: {} });
    armList(getRoutines, [], [{ id: "r-1", name: "Morning flow" }]);
    createSchedule.mockResolvedValue({ success: {} });
  };

  /**
   * The whole point of the change. A placement carries only a name, so before this the
   * routine step could not reach anything the user had not already accepted — and the
   * resolver drops what it cannot find, in silence, so the section simply came out
   * empty. Creating the described item first is what turns the name into an id.
   */
  test("creates the new habit and task first, then places them in the routine", async () => {
    armRoutine();
    createHabit.mockResolvedValue({ success: {} });
    armList(getHabits, [], [{ id: "h-new", name: "Stretch" }]);
    createTask.mockResolvedValue({ success: {} });
    armList(getTasks, [], [{ id: "t-new", name: "Buy a mat" }]);

    const result = await createRoutineFromSuggestion(
      draft({
        newHabits: [{ name: "Stretch", description: "Five minutes", motivationalPhrase: "Go",
          iconId: "lucide:activity", categoryName: "Health", importance: 3, difficulty: 2 }],
        newTasks: [{ name: "Buy a mat", description: "Before starting",
          iconId: "lucide:shopping-bag", categoryName: "Health", importance: 2, difficulty: 1 }]
      }) as never,
      [], [], t, vi.fn(), [{ id: "cat-1", name: "Health" }]);

    expect(createHabit).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledTimes(1);

    const routineArg = createRoutine.mock.calls[0][0];
    expect(routineArg.routineSections[0].habitGroup).toEqual(
      [{ habitId: "h-new", startTime: "07:00", endTime: "07:15" }]);
    expect(routineArg.routineSections[0].taskGroup).toEqual(
      [{ taskId: "t-new", startTime: "07:15", endTime: "07:20" }]);

    // Handed back so the wizard can record them: its progress is persisted, and an
    // item missing from that record is built again when someone resumes.
    expect(result.newHabits).toEqual([{ id: "h-new", name: "Stretch" }]);
    expect(result.newTasks).toEqual([{ id: "t-new", name: "Buy a mat" }]);
  });

  /**
   * A model told not to restate an existing item restates it anyway sometimes, and a
   * duplicate habit is the one mistake here the user has to clean up by hand.
   */
  test("does not re-create something the user already accepted", async () => {
    armRoutine();

    const result = await createRoutineFromSuggestion(
      draft({
        newHabits: [{ name: "stretch", description: "d", motivationalPhrase: "m",
          iconId: "lucide:activity", categoryName: "Health", importance: 3, difficulty: 2 }],
        newTasks: []
      }) as never,
      [{ id: "h-1", name: "Stretch" }], [], t, vi.fn(), [{ id: "cat-1", name: "Health" }]);

    // Matched case-insensitively, so nothing is created and the placement resolves to
    // the habit that was already there.
    expect(createHabit).not.toHaveBeenCalled();
    expect(result.newHabits).toEqual([]);
    expect(createRoutine.mock.calls[0][0].routineSections[0].habitGroup).toEqual(
      [{ habitId: "h-1", startTime: "07:00", endTime: "07:15" }]);
  });

  test("still works for a draft that needs nothing new", async () => {
    armRoutine();

    const result = await createRoutineFromSuggestion(
      draft({}) as never, [{ id: "h-1", name: "Stretch" }], [], t, vi.fn());

    expect(createHabit).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(result.newHabits).toEqual([]);
    expect(result.newTasks).toEqual([]);
  });
});

/**
 * The failure this module was changed for, reported from production as an account
 * holding 58 habits after accepting 3.
 *
 * The wizard's habits/tasks step creates every habit, then every task, and only
 * records what it made once both loops are done. A task create that fails therefore
 * leaves habits behind that nothing has a reference to, and the error banner's Try
 * again re-runs the same closure from the top.
 */
describe("a step re-run after a failure partway through", () => {
  // Stands in for the account: what the server holds, and what a create adds to it.
  let habitRows: Array<{ id: string; name: string }>;
  let taskRows: Array<{ id: string; name: string }>;

  beforeEach(() => {
    createHabit.mockReset(); getHabits.mockReset();
    createTask.mockReset(); getTasks.mockReset();
    habitRows = [];
    taskRows = [];
    createHabit.mockImplementation((name: string) => {
      habitRows.push({ id: `h-${habitRows.length + 1}`, name });
      return Promise.resolve({ success: {} });
    });
    getHabits.mockImplementation(() => Promise.resolve({ success: [...habitRows] }));
    getTasks.mockImplementation(() => Promise.resolve({ success: [...taskRows] }));
  });

  const cats = [{ id: "cat-1", name: "Health" }];
  const habit = (name: string) => ({
    name, description: "d", motivationalPhrase: "", iconId: "lucide:zap",
    categoryName: "Health", importance: 3, difficulty: 3
  });
  const chore = (name: string) => ({
    name, description: "d", iconId: "lucide:star",
    categoryName: "Health", importance: 2, difficulty: 1
  });

  /** What the wizard's step does, in the order it does it. */
  const runStep = async (
    habits: ReturnType<typeof habit>[],
    tasks: ReturnType<typeof chore>[]
  ) => {
    await createHabitsFromSuggestions(habits, cats, t, vi.fn());
    await createTasksFromSuggestions(tasks, cats, t, vi.fn());
  };

  test("does not create the habits again on every retry", async () => {
    const habits = [habit("Run"), habit("Read"), habit("Meditate")];
    const tasks = [chore("Buy shoes")];
    // The production trigger: the task INSERT was the one blowing up, on a
    // description longer than the column.
    createTask.mockResolvedValue({ error: { message: "value too long" } });

    await expect(runStep(habits, tasks)).rejects.toThrow();
    expect(habitRows).toHaveLength(3);

    // Try again, twice, with the task still failing. This is where the account used
    // to pick up a second and third copy of all three habits.
    await expect(runStep(habits, tasks)).rejects.toThrow();
    await expect(runStep(habits, tasks)).rejects.toThrow();

    expect(habitRows.map((h) => h.name)).toEqual(["Run", "Read", "Meditate"]);
    expect(createHabit).toHaveBeenCalledTimes(3);
  });

  test("the pass that finally succeeds hands back a ref for all of them", async () => {
    // Skipping a create must not mean skipping its ref: the routine and summary
    // steps read these, and an item missing from them is built again later.
    const habits = [habit("Run"), habit("Read")];
    createTask.mockResolvedValueOnce({ error: { message: "value too long" } });
    createTask.mockImplementation((name: string) => {
      taskRows.push({ id: `t-${taskRows.length + 1}`, name });
      return Promise.resolve({ success: {} });
    });

    await expect(runStep(habits, [chore("Buy shoes")])).rejects.toThrow();

    const habitRefs = await createHabitsFromSuggestions(habits, cats, t, vi.fn());
    const taskRefs = await createTasksFromSuggestions([chore("Buy shoes")], cats, t, vi.fn());

    expect(createHabit).toHaveBeenCalledTimes(2);
    expect(habitRefs).toEqual([{ id: "h-1", name: "Run" }, { id: "h-2", name: "Read" }]);
    expect(taskRefs).toEqual([{ id: "t-1", name: "Buy shoes" }]);
  });

  test("recognises the existing row past a difference in case or padding", async () => {
    habitRows.push({ id: "h-9", name: "Morning run" });

    const refs = await createHabitsFromSuggestions([habit("  morning RUN ")], cats, t, vi.fn());

    expect(createHabit).not.toHaveBeenCalled();
    expect(refs).toEqual([{ id: "h-9", name: "Morning run" }]);
  });
});

describe("a routine step re-run after the schedule failed", () => {
  let routineRows: Array<{ id: string; name: string }>;

  beforeEach(() => {
    createRoutine.mockReset(); getRoutines.mockReset(); createSchedule.mockReset();
    createHabit.mockReset(); createTask.mockReset();
    routineRows = [];
    createRoutine.mockImplementation((r: { name: string }) => {
      routineRows.push({ id: `r-${routineRows.length + 1}`, name: r.name });
      return Promise.resolve({ success: {} });
    });
    getRoutines.mockImplementation(() => Promise.resolve({ success: [...routineRows] }));
  });

  test("reuses the routine the failed pass already saved", async () => {
    // The create runs before the schedule, so anything failing after it leaves a
    // routine behind. Two routines under one name is worse than a duplicate habit:
    // the dashboard picks one and the other sits there scheduled for nothing.
    createSchedule.mockResolvedValueOnce({ error: { message: "nope" } });
    createSchedule.mockResolvedValue({ success: {} });
    const draft = {
      name: "Morning flow", iconId: "lucide:sun", scheduleDays: ["Monday"], sections: []
    } as never;

    await expect(createRoutineFromSuggestion(draft, [], [], t, vi.fn())).rejects.toThrow();
    expect(routineRows).toHaveLength(1);

    const result = await createRoutineFromSuggestion(draft, [], [], t, vi.fn());

    expect(createRoutine).toHaveBeenCalledTimes(1);
    expect(routineRows).toHaveLength(1);
    expect(result.routineId).toBe("r-1");
  });
});

describe("what a failed create tells the error screen", () => {
  // The wizard used to get a bare Error and could only say "AI setup is
  // unavailable" — for a rejected POST /habit, which misled both the user and
  // the diagnosis. The typed error names the entity, carries the server's
  // translated reason, and lists what was already safe when the failure hit.
  beforeEach(() => {
    createHabit.mockReset(); getHabits.mockReset();
    createRoutine.mockReset(); getRoutines.mockReset(); createSchedule.mockReset();
    createTask.mockReset(); getTasks.mockReset();
  });

  const cats = [{ id: "cat-1", name: "Health" }];
  const habit = (name: string) => ({
    name, description: "d", motivationalPhrase: "", iconId: "lucide:zap",
    categoryName: "Health", importance: 3, difficulty: 3
  });

  test("names the habit that failed, the translated reason, and what already landed", async () => {
    // "Existing" is on the account already; "Run" lands; "Meditate" is refused.
    armList(getHabits, [{ id: "h-0", name: "Existing" }]);
    createHabit.mockResolvedValueOnce({ success: {} });
    createHabit.mockResolvedValueOnce({ error: { errorKey: "HABIT_CREATE_FAILED" } });

    const err = await createHabitsFromSuggestions(
      [habit("Existing"), habit("Run"), habit("Meditate")], cats, t, vi.fn()
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SuggestionCreateError);
    const failure = err as SuggestionCreateError;
    expect(failure.kind).toBe("habit");
    expect(failure.entityName).toBe("Meditate");
    // Identity t in these tests: the message is the errorKey run through t().
    expect(failure.message).toBe("HABIT_CREATE_FAILED");
    expect(failure.savedNames).toEqual(["Existing", "Run"]);
  });

  test("a refused routine save reports kind routine with the step's new items safe", async () => {
    armList(getHabits, []);
    createHabit.mockResolvedValue({ success: {} });
    getHabits.mockResolvedValue({ success: [{ id: "h-1", name: "Wind down" }] });
    armList(getRoutines, []);
    createRoutine.mockResolvedValue({ error: { message: "nope" } });

    const err = await createRoutineFromSuggestion(
      {
        name: "Morning flow", iconId: "lucide:sun", scheduleDays: [],
        sections: [], newHabits: [habit("Wind down")]
      } as never,
      [], [], t, vi.fn(), cats
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SuggestionCreateError);
    const failure = err as SuggestionCreateError;
    expect(failure.kind).toBe("routine");
    expect(failure.entityName).toBe("Morning flow");
    expect(failure.savedNames).toEqual(["Wind down"]);
  });

  test("a refused schedule reports kind schedule with the routine on the safe list", async () => {
    armList(getRoutines, [], [{ id: "r-1", name: "Morning flow" }]);
    createRoutine.mockResolvedValue({ success: {} });
    createSchedule.mockResolvedValue({ error: { message: "nope" } });

    const err = await createRoutineFromSuggestion(
      { name: "Morning flow", iconId: "lucide:sun", scheduleDays: ["Monday"], sections: [] } as never,
      [], [], t, vi.fn()
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SuggestionCreateError);
    const failure = err as SuggestionCreateError;
    expect(failure.kind).toBe("schedule");
    expect(failure.savedNames).toContain("Morning flow");
  });
});
