import { describe, test, expect, vi, beforeEach } from "vitest";

const createCategory = vi.fn();
const getCategories = vi.fn();
vi.mock("@beyou/api/categories/createCategory", () => ({ default: (...a: unknown[]) => createCategory(...a) }));
vi.mock("@beyou/api/categories/getCategories", () => ({ default: (...a: unknown[]) => getCategories(...a) }));

import { createCategoriesFromSuggestions } from "./createFromSuggestions";

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
