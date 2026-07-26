import { describe, test, expect, vi, beforeEach } from "vitest";
import { setHttpClient, ApiError } from "../httpClient";
import listFeedbackAdminItems from "./listFeedbackAdminItems";

const t = ((key: string) => `tr:${key}`) as never;

describe("listFeedbackAdminItems", () => {
  const get = vi.fn();

  beforeEach(() => {
    get.mockReset();
    setHttpClient({ get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
  });

  test("sends every filter the caller asked for", async () => {
    get.mockResolvedValue({ data: { items: [], page: 2, size: 50, totalItems: 0, totalPages: 0 } });

    await listFeedbackAdminItems({ status: "OPEN", category: "BUG", page: 2, size: 50 }, t);

    expect(get).toHaveBeenCalledWith("/feedback/admin/items", {
      params: { status: "OPEN", category: "BUG", page: 2, size: 50 },
    });
  });

  test("omits filters the caller left out rather than sending empty values", async () => {
    get.mockResolvedValue({ data: { items: [] } });

    await listFeedbackAdminItems({}, t);

    expect(get).toHaveBeenCalledWith("/feedback/admin/items", { params: {} });
  });

  test("returns the page envelope on success", async () => {
    const page = {
      items: [{ id: "fb-1", category: "BUG", status: "OPEN", body: "broke" }],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    };
    get.mockResolvedValue({ data: page });

    const result = await listFeedbackAdminItems({}, t);

    expect(result.success).toEqual(page);
    expect(result.error).toBeUndefined();
  });

  test("parses a server refusal into the error envelope instead of throwing", async () => {
    get.mockRejectedValue(new ApiError(403, { errorKey: "ACCESS_DENIED", message: "Forbidden" }));

    const result = await listFeedbackAdminItems({}, t);

    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe("ACCESS_DENIED");
  });

  test("falls back to a translated message on network failure", async () => {
    get.mockRejectedValue(new TypeError("Network request failed"));

    const result = await listFeedbackAdminItems({}, t);

    expect(result.error).toEqual({ message: "tr:UnexpectedError" });
  });
});
