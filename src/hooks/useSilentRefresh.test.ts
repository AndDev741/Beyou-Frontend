import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/axiosConfig", () => ({
  default: { defaults: { headers: { common: {} } } },
}));

vi.mock("../services/authentication/request/refreshTokenRequest", () => ({
  default: vi.fn(),
}));

import refreshTokenRequest from "../services/authentication/request/refreshTokenRequest";
import axios from "../services/axiosConfig";
import { useSilentRefresh } from "./useSilentRefresh";

describe("useSilentRefresh", () => {
  beforeEach(() => {
    (axios as any).defaults.headers.common = {};
    vi.clearAllMocks();
  });

  it("starts in 'checking' state", () => {
    (refreshTokenRequest as any).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSilentRefresh());
    expect(result.current).toBe("checking");
  });

  it("transitions to 'authenticated' and stores token on success", async () => {
    (refreshTokenRequest as any).mockResolvedValueOnce({
      headers: { "x-access-token": "new-token-123" },
    });

    const { result } = renderHook(() => useSilentRefresh());

    await waitFor(() => expect(result.current).toBe("authenticated"));
    expect((axios as any).defaults.headers.common.Authorization).toBe(
      "Bearer new-token-123"
    );
  });

  it("transitions to 'unauthenticated' when refresh throws", async () => {
    (refreshTokenRequest as any).mockRejectedValueOnce(
      new Error("Refresh failed")
    );

    const { result } = renderHook(() => useSilentRefresh());

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
  });

  it("transitions to 'unauthenticated' when response has no x-access-token header", async () => {
    (refreshTokenRequest as any).mockResolvedValueOnce({ headers: {} });

    const { result } = renderHook(() => useSilentRefresh());

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
  });
});
