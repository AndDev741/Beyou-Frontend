import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import store from "../redux/store";

vi.mock("../services/axiosConfig", () => ({
  default: { defaults: { headers: { common: {} } } },
}));

vi.mock("../services/authentication/request/refreshTokenRequest", () => ({
  default: vi.fn(),
}));

// The hook re-fetches the profile after restoring the token. Stub it so these
// tests stay focused on the boot state machine, not the profile round-trip.
vi.mock("../services/user/getProfile", () => ({
  default: vi.fn(() => Promise.resolve({ data: undefined })),
}));

import refreshTokenRequest from "../services/authentication/request/refreshTokenRequest";
import getProfile from "../services/user/getProfile";
import axios from "../services/axiosConfig";
import { useSilentRefresh } from "./useSilentRefresh";

// useSilentRefresh now reads the redux dispatch, so it must render under a Provider.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(Provider, { store }, children);

describe("useSilentRefresh", () => {
  beforeEach(() => {
    (axios as any).defaults.headers.common = {};
    vi.clearAllMocks();
    (getProfile as any).mockResolvedValue({ data: undefined });
  });

  it("starts in 'checking' state", () => {
    (refreshTokenRequest as any).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSilentRefresh(), { wrapper });
    expect(result.current).toBe("checking");
  });

  it("transitions to 'authenticated' and stores token on success", async () => {
    (refreshTokenRequest as any).mockResolvedValueOnce({
      headers: { "x-access-token": "new-token-123" },
    });

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("authenticated"));
    expect((axios as any).defaults.headers.common.Authorization).toBe(
      "Bearer new-token-123"
    );
    // Profile re-hydration is attempted once the token is restored.
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it("transitions to 'unauthenticated' when refresh throws", async () => {
    (refreshTokenRequest as any).mockRejectedValueOnce(
      new Error("Refresh failed")
    );

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
  });

  it("transitions to 'unauthenticated' when response has no x-access-token header", async () => {
    (refreshTokenRequest as any).mockResolvedValueOnce({ headers: {} });

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
    // No token → no profile fetch.
    expect(getProfile).not.toHaveBeenCalled();
  });
});
