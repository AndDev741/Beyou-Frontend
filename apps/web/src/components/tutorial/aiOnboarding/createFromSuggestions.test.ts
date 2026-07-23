import { describe, test, expect, vi, beforeEach } from "vitest";

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

import {
  createCategoriesFromSuggestions,
  createHabitsFromSuggestions,
  createTasksFromSuggestions
} from "./createFromSuggestions";

const t = ((k: string) => k) as never;

describe("createCategoriesFromSuggestions", () => {
  beforeEach(() => { createCategory.mockReset(); getCategories.mockReset(); });

  test("creates each suggestion, re-fetches, dispatches, returns id refs", async () => {
    createCategory.mockResolvedValue({ success: {} });
    getCategories.mockResolvedValue({ success: [
      { id: "id-1", name: "Health" }, { id: "id-2", name: "Career" }
    ]});
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
    getHabits.mockResolvedValue({ success: [{ id: "h-1", name: "Run" }] });
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
    getHabits.mockResolvedValue({ success: [{ id: "h-1", name: "Run" }] });
    await createHabitsFromSuggestions(
      [{ name: "Run", description: "d", motivationalPhrase: "", iconId: "lucide:zap",
         categoryName: "Nope", importance: 3, difficulty: 3 }],
      [{ id: "cat-1", name: "Health" }], t, vi.fn());
    expect(createHabit).toHaveBeenCalledWith("Run", "d", "", 3, 3, "lucide:zap", 0, ["cat-1"], t);
  });

  test("throws when a create fails so the wizard can show retry", async () => {
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
    getTasks.mockResolvedValue({ success: [{ id: "t-1", name: "Buy shoes" }] });
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
    createTask.mockResolvedValue({ error: { message: "nope" } });
    await expect(createTasksFromSuggestions(
      [{ name: "Buy shoes", description: "d", iconId: "lucide:zap",
         categoryName: "Health", importance: 3, difficulty: 3 }],
      [{ id: "cat-1", name: "Health" }], t, vi.fn()
    )).rejects.toThrow();
  });
});
