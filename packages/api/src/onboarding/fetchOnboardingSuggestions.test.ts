import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient } from "../httpClient";
import fetchOnboardingSuggestions from "./fetchOnboardingSuggestions";

const t = ((key: string) => key) as never;

describe("fetchOnboardingSuggestions", () => {
  const post = vi.fn();

  beforeEach(() => {
    post.mockReset();
    setHttpClient({ post, get: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("posts step and body, returns suggestions", async () => {
    post.mockResolvedValue({ data: { categories: [{ name: "Health", description: "d", iconId: "lucide:star" }] } });

    const result = await fetchOnboardingSuggestions({ step: "CATEGORIES", categoryNames: ["Health"] }, t);

    expect(post).toHaveBeenCalledWith("/onboarding/suggestions", { step: "CATEGORIES", categoryNames: ["Health"] });
    expect(result.success?.categories?.[0].name).toBe("Health");
  });

  test("returns error payload on failure", async () => {
    post.mockRejectedValue(new Error("boom"));

    const result = await fetchOnboardingSuggestions({ step: "GOALS" }, t);

    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });
});
