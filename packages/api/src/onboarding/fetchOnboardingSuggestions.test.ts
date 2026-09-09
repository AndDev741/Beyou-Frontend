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

    expect(post).toHaveBeenCalledWith(
      "/onboarding/suggestions",
      { step: "CATEGORIES", categoryNames: ["Health"] },
      { timeout: 90_000 },
    );
    expect(result.success?.categories?.[0].name).toBe("Health");
  });

  // Without the override this call inherits the mobile client's 20s abort, which is
  // shorter than the LLM behind the endpoint takes: production answered in 31s and
  // 60s, so every attempt aborted and the wizard reported the AI as unavailable.
  test("asks for far more time than a plain REST call gets", async () => {
    post.mockResolvedValue({ data: {} });

    await fetchOnboardingSuggestions({ step: "HABITS_TASKS" }, t);

    const config = post.mock.calls[0][2];
    expect(config?.timeout).toBeGreaterThan(60_000);
  });

  test("returns error payload on failure", async () => {
    post.mockRejectedValue(new Error("boom"));

    const result = await fetchOnboardingSuggestions({ step: "GOALS" }, t);

    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });
});
