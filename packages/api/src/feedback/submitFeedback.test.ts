import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import submitFeedback from "./submitFeedback";

const t = ((key: string) => `tr:${key}`) as never;

const blob = (name: string) => ({ blob: new Blob([name], { type: "image/png" }), name });

describe("submitFeedback", () => {
  const post = vi.fn();

  beforeEach(() => {
    post.mockReset();
    setHttpClient({ post, get: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("creates the submission and returns the success envelope when there are no images", async () => {
    post.mockResolvedValue({ data: { id: "fb-1", category: "OTHER", body: "nice app" } });

    const result = await submitFeedback({ category: "OTHER", body: "nice app" }, t);

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.success?.feedback.id).toBe("fb-1");
    expect(result.success?.attachments).toEqual([]);
    expect(result.success?.failedAttachments).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  test("uploads every image after the submission exists", async () => {
    post
      .mockResolvedValueOnce({ data: { id: "fb-1" } })
      .mockResolvedValueOnce({ data: { id: "att-1" } })
      .mockResolvedValueOnce({ data: { id: "att-2" } })
      .mockResolvedValueOnce({ data: { id: "att-3" } });

    const result = await submitFeedback(
      { category: "BUG", body: "broken", attachments: [blob("a"), blob("b"), blob("c")] },
      t
    );

    expect(post).toHaveBeenCalledTimes(4);
    expect(post.mock.calls[0][0]).toBe("/feedback");
    expect(post.mock.calls[1][0]).toBe("/feedback/fb-1/attachments");
    expect(result.success?.attachments).toHaveLength(3);
    expect(result.success?.failedAttachments).toEqual([]);
  });

  test("a stored submission whose third image failed is NOT a total failure", async () => {
    post
      .mockResolvedValueOnce({ data: { id: "fb-1" } })
      .mockResolvedValueOnce({ data: { id: "att-1" } })
      .mockResolvedValueOnce({ data: { id: "att-2" } })
      .mockRejectedValueOnce(new ApiError(400, { errorKey: "FEEDBACK_ATTACHMENT_TOO_LARGE" }));

    const result = await submitFeedback(
      { category: "BUG", body: "broken", attachments: [blob("a"), blob("b"), blob("c")] },
      t
    );

    expect(result.error).toBeUndefined();
    expect(result.success?.feedback.id).toBe("fb-1");
    expect(result.success?.attachments).toHaveLength(2);
    expect(result.success?.failedAttachments).toEqual([
      { index: 2, name: "c", error: { errorKey: "FEEDBACK_ATTACHMENT_TOO_LARGE", message: undefined, details: undefined } },
    ]);
  });

  test("keeps uploading the remaining images after one fails", async () => {
    post
      .mockResolvedValueOnce({ data: { id: "fb-1" } })
      .mockRejectedValueOnce(new ApiError(400, { errorKey: "FEEDBACK_ATTACHMENT_CORRUPT" }))
      .mockResolvedValueOnce({ data: { id: "att-2" } });

    const result = await submitFeedback(
      { category: "BUG", body: "broken", attachments: [blob("a"), blob("b")] },
      t
    );

    expect(post).toHaveBeenCalledTimes(3);
    expect(result.success?.attachments).toHaveLength(1);
    expect(result.success?.failedAttachments).toHaveLength(1);
  });

  test("a failed submission is a total failure and uploads nothing", async () => {
    post.mockRejectedValueOnce(new ApiError(429, { errorKey: "RATE_LIMIT_EXCEEDED" }));

    const result = await submitFeedback(
      { category: "BUG", body: "broken", attachments: [blob("a")] },
      t
    );

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe("RATE_LIMIT_EXCEEDED");
  });

  test("returns the translated fallback when the network is down", async () => {
    post.mockRejectedValueOnce(new TypeError("Network request failed"));

    const result = await submitFeedback({ category: "BUG", body: "broken" }, t);

    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });

  test("fails fast when the created submission carries no id to attach to", async () => {
    post.mockResolvedValueOnce({ data: {} });

    const result = await submitFeedback(
      { category: "BUG", body: "broken", attachments: [blob("a")] },
      t
    );

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
