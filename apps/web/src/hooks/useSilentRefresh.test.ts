import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { ApiError } from "@beyou/api";
import store from "../redux/store";

vi.mock("../services/axiosConfig", () => ({
  default: { defaults: { headers: { common: {} } } },
}));

// Only the SINK is stubbed. `reportRefreshFailure` and `isReportableFailure`
// both run for real, so these tests prove the boot path is wired to the shared
// rule rather than merely that it delegates somewhere.
const mockReportHandledFailure = vi.fn();
vi.mock("../lib/telemetry", () => ({
  reportHandledFailure: (...args: unknown[]) => mockReportHandledFailure(...args),
}));

vi.mock("../services/authentication/request/refreshTokenRequest", () => ({
  default: vi.fn(),
}));

// The hook re-fetches the profile after restoring the token. Stub it so these
// tests stay focused on the boot state machine, not the profile round-trip.
vi.mock("@beyou/api/user/getProfile", () => ({
  default: vi.fn(() => Promise.resolve({ data: undefined })),
}));

import refreshTokenRequest from "../services/authentication/request/refreshTokenRequest";
import getProfile from "@beyou/api/user/getProfile";
import axios from "../services/axiosConfig";
import { useSilentRefresh } from "./useSilentRefresh";

// useSilentRefresh now reads the redux dispatch, so it must render under a Provider.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(Provider, { store, children });

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

/**
 * #7. This is the DOMINANT refresh path, and it was the silent one.
 *
 * The hook calls `refreshTokenRequest()` directly on mount, so the axios
 * interceptor — where refresh failures were already being reported — is never
 * involved. A boot-time `catch {}` therefore meant a `/auth/refresh` outage
 * logged every signed-in user out with the collector hearing nothing, and the
 * silent refresh runs before anything else, so that is the shape the outage
 * actually takes.
 *
 * The boundary is `isReportableFailure`'s, not a second copy of it: 5xx and
 * transport failures are reported, a 401 is not.
 */
describe("useSilentRefresh — refresh endpoint outage", () => {
  /** What axios rejects with once the server has answered. */
  const refreshAnswered = (status: number) => ({
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    config: { url: "/auth/refresh" },
    response: { status },
  });

  beforeEach(() => {
    (axios as any).defaults.headers.common = {};
    vi.clearAllMocks();
    (getProfile as any).mockResolvedValue({ data: undefined });
  });

  it("reports a 5xx — a refresh outage during page load is no longer invisible", async () => {
    (refreshTokenRequest as any).mockRejectedValueOnce(refreshAnswered(503));

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
    expect(mockReportHandledFailure).toHaveBeenCalledTimes(1);
    const [reported] = mockReportHandledFailure.mock.calls[0];
    expect(reported).toBeInstanceOf(ApiError);
    expect((reported as ApiError).status).toBe(503);
  });

  it("does NOT report a 401 — an absent or expired session is routine", async () => {
    // The backend answers 401 REFRESH_TOKEN_NOT_FOUND when there is no refresh
    // cookie at all, so this fires on every anonymous page load.
    (refreshTokenRequest as any).mockRejectedValueOnce(refreshAnswered(401));

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
    expect(mockReportHandledFailure).not.toHaveBeenCalled();
  });

  it("reports a refresh that never reached the server", async () => {
    (refreshTokenRequest as any).mockRejectedValueOnce(
      Object.assign(new Error("Network Error"), { isAxiosError: true })
    );

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
    expect(mockReportHandledFailure).toHaveBeenCalledTimes(1);
  });

  it("reports a 200 that carries no access token, as the interceptor path does", async () => {
    // Not a normal state: the backend 401s when the cookie is missing, so a 200
    // with no X-Access-Token means the header was lost (exposed-headers/proxy
    // misconfiguration) — which breaks every session.
    (refreshTokenRequest as any).mockResolvedValueOnce({ headers: {} });

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
    expect(mockReportHandledFailure).toHaveBeenCalledTimes(1);
  });

  it("reports nothing when the refresh succeeds", async () => {
    (refreshTokenRequest as any).mockResolvedValueOnce({
      headers: { "x-access-token": "fresh" },
    });

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("authenticated"));
    expect(mockReportHandledFailure).not.toHaveBeenCalled();
  });

  it("reports nothing when only the profile re-fetch fails", async () => {
    // A profile failure is non-fatal and is already reported by the API client's
    // own logger; treating it as a refresh outage would double-count it.
    (refreshTokenRequest as any).mockResolvedValueOnce({
      headers: { "x-access-token": "fresh" },
    });
    (getProfile as any).mockRejectedValueOnce(new ApiError(500));

    const { result } = renderHook(() => useSilentRefresh(), { wrapper });

    await waitFor(() => expect(result.current).toBe("unauthenticated"));
    expect(mockReportHandledFailure).not.toHaveBeenCalled();
  });
});
