import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import getFeedbackAdminCounts from "./getFeedbackAdminCounts";

const t = ((key: string) => `tr:${key}`) as never;

describe("getFeedbackAdminCounts", () => {
  const get = vi.fn();

  beforeEach(() => {
    get.mockReset();
    setHttpClient({ get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("reads the unfiltered counters and passes no query at all", async () => {
    const counts = { open: 4, takingCare: 1, closed: 9, total: 14 };
    get.mockResolvedValue({ data: counts });

    const result = await getFeedbackAdminCounts(t);

    expect(get).toHaveBeenCalledWith("/feedback/admin/counts");
    expect(result.success).toEqual(counts);
  });

  test("returns the error envelope when the server refuses", async () => {
    get.mockRejectedValue(new ApiError(403, { errorKey: "ACCESS_DENIED" }));

    const result = await getFeedbackAdminCounts(t);

    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe("ACCESS_DENIED");
  });

  test("falls back to a translated message on network failure", async () => {
    get.mockRejectedValue(new TypeError("Network request failed"));

    const result = await getFeedbackAdminCounts(t);

    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
