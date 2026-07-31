import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import getFeedbackAdminItem from "./getFeedbackAdminItem";

const t = ((key: string) => `tr:${key}`) as never;

describe("getFeedbackAdminItem", () => {
  const get = vi.fn();

  beforeEach(() => {
    get.mockReset();
    setHttpClient({ get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("reads one submission with its attachments and replies", async () => {
    const detail = {
      id: "fb-1",
      category: "BUG",
      status: "OPEN",
      body: "broke",
      attachments: [{ id: "att-1", feedbackId: "fb-1", url: "/feedback/fb-1/attachments/att-1" }],
      replies: [{ id: "rep-1", feedbackId: "fb-1", body: "looking", authorName: "Owner" }],
    };
    get.mockResolvedValue({ data: detail });

    const result = await getFeedbackAdminItem("fb-1", t);

    expect(get).toHaveBeenCalledWith("/feedback/admin/items/fb-1");
    expect(result.success).toEqual(detail);
  });

  test("returns the error envelope for an unknown id", async () => {
    get.mockRejectedValue(new ApiError(400, { errorKey: "FEEDBACK_NOT_FOUND" }));

    const result = await getFeedbackAdminItem("nope", t);

    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe("FEEDBACK_NOT_FOUND");
  });

  test("falls back to a translated message on network failure", async () => {
    get.mockRejectedValue(new TypeError("Network request failed"));

    const result = await getFeedbackAdminItem("fb-1", t);

    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
