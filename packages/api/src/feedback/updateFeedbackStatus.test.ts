import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import updateFeedbackStatus from "./updateFeedbackStatus";

const t = ((key: string) => `tr:${key}`) as never;

describe("updateFeedbackStatus", () => {
  const put = vi.fn();
  const post = vi.fn();

  beforeEach(() => {
    put.mockReset();
    post.mockReset();
    setHttpClient({ put, post, get: vi.fn(), delete: vi.fn() } as never);
  });

  test("puts the new status and returns the updated item", async () => {
    const updated = { id: "fb-1", category: "BUG", status: "TAKING_CARE", body: "broke" };
    put.mockResolvedValue({ data: updated });

    const result = await updateFeedbackStatus("fb-1", "TAKING_CARE", t);

    expect(put).toHaveBeenCalledWith("/feedback/admin/items/fb-1/status", { status: "TAKING_CARE" });
    expect(result.success).toEqual(updated);
  });

  test("does not post anything — a status change notifies nobody (R15)", async () => {
    put.mockResolvedValue({ data: { id: "fb-1", status: "CLOSED" } });

    await updateFeedbackStatus("fb-1", "CLOSED", t);

    expect(post).not.toHaveBeenCalled();
  });

  test("returns the error envelope when the server refuses", async () => {
    put.mockRejectedValue(new ApiError(403, { errorKey: "ACCESS_DENIED" }));

    const result = await updateFeedbackStatus("fb-1", "OPEN", t);

    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe("ACCESS_DENIED");
  });

  test("falls back to a translated message on network failure", async () => {
    put.mockRejectedValue(new TypeError("Network request failed"));

    const result = await updateFeedbackStatus("fb-1", "OPEN", t);

    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
