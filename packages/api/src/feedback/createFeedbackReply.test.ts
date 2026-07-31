import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import createFeedbackReply from "./createFeedbackReply";

const t = ((key: string) => `tr:${key}`) as never;

describe("createFeedbackReply", () => {
  const post = vi.fn();

  beforeEach(() => {
    post.mockReset();
    setHttpClient({ post, get: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("posts the reply body and returns the stored reply", async () => {
    const reply = {
      id: "rep-1",
      feedbackId: "fb-1",
      body: "Fixed in the next release.",
      authorName: "Owner",
      createdAt: "2026-07-26T10:00:00",
    };
    post.mockResolvedValue({ data: reply });

    const result = await createFeedbackReply("fb-1", "Fixed in the next release.", t);

    expect(post).toHaveBeenCalledWith("/feedback/admin/items/fb-1/replies", {
      body: "Fixed in the next release.",
    });
    expect(result.success).toEqual(reply);
  });

  test("returns the error envelope on a rejected body", async () => {
    post.mockRejectedValue(new ApiError(400, { errorKey: "VALIDATION_ERROR", message: "blank" }));

    const result = await createFeedbackReply("fb-1", "", t);

    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe("VALIDATION_ERROR");
  });

  test("falls back to a translated message on network failure", async () => {
    post.mockRejectedValue(new TypeError("Network request failed"));

    const result = await createFeedbackReply("fb-1", "hello", t);

    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
