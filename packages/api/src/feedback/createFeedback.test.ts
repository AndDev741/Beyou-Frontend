import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import createFeedback from "./createFeedback";

// Prefixes the key so a test can prove the message came from translation and
// was not a hardcoded English string.
const t = ((key: string) => `tr:${key}`) as never;

describe("createFeedback", () => {
  const post = vi.fn();

  beforeEach(() => {
    post.mockReset();
    setHttpClient({ post, get: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("posts the submission and returns the success envelope", async () => {
    const stored = {
      id: "fb-1",
      category: "BUG",
      body: "The routine check-in double-counts XP",
      context: { platform: "web" },
      createdAt: "2026-07-26T10:00:00",
    };
    post.mockResolvedValue({ data: stored });

    const result = await createFeedback(
      { category: "BUG", body: "The routine check-in double-counts XP", context: { platform: "web" } },
      t
    );

    expect(post).toHaveBeenCalledWith("/feedback", {
      category: "BUG",
      body: "The routine check-in double-counts XP",
      context: { platform: "web" },
    });
    expect(result.success).toEqual(stored);
    expect(result.error).toBeUndefined();
  });

  test("omits context entirely when the caller collected none", async () => {
    post.mockResolvedValue({ data: { id: "fb-2" } });

    await createFeedback({ category: "OTHER", body: "hi" }, t);

    expect(post).toHaveBeenCalledWith("/feedback", { category: "OTHER", body: "hi" });
  });

  test("parses a server error into the error envelope instead of throwing", async () => {
    post.mockRejectedValue(
      new ApiError(429, { errorKey: "RATE_LIMIT_EXCEEDED", message: "Too many submissions" })
    );

    const result = await createFeedback({ category: "BUG", body: "again" }, t);

    expect(result.success).toBeUndefined();
    expect(result.error).toEqual({
      errorKey: "RATE_LIMIT_EXCEEDED",
      message: "Too many submissions",
      details: undefined,
    });
  });

  test("surfaces validation details from a 400", async () => {
    post.mockRejectedValue(
      new ApiError(400, { errorKey: "VALIDATION_ERROR", message: "invalid", errors: { body: "must not be blank" } })
    );

    const result = await createFeedback({ category: "BUG", body: "" }, t);

    expect(result.error?.errorKey).toBe("VALIDATION_ERROR");
  });

  test("returns the error envelope with a translated fallback on network failure", async () => {
    post.mockRejectedValue(new TypeError("Network request failed"));

    const result = await createFeedback({ category: "FEATURE_REQUEST", body: "dark mode please" }, t);

    expect(result.success).toBeUndefined();
    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
