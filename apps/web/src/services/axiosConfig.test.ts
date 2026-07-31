import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError } from "@beyou/api";

/**
 * #7. The interceptor rejects with the caller's original 401 — correct, that IS
 * what the caller's request returned — but it makes a refresh-endpoint OUTAGE
 * invisible: 401 is deliberately not reportable, and the only other caller
 * (`useSilentRefresh`) swallows the failure with `catch {}`. If `/auth/refresh`
 * starts answering 500, every signed-in user is bounced to the login screen and
 * the collector never hears about it.
 *
 * These tests pin the boundary to `isReportableFailure`'s rule rather than a
 * second copy of it: 5xx and transport failures are reported, a 401 is not.
 */

/** Captured by the local axios mock, immune to vitest's global `mockReset`. */
const captured = vi.hoisted(() => ({
    onRejected: undefined as ((error: unknown) => Promise<unknown>) | undefined
}));

vi.mock("axios", () => {
    const instance = Object.assign(vi.fn(), {
        interceptors: {
            response: {
                use: (_onFulfilled: unknown, onRejected: (error: unknown) => Promise<unknown>) => {
                    captured.onRejected = onRejected;
                }
            }
        },
        defaults: { headers: { common: {} as Record<string, unknown> }, baseURL: "" }
    });
    return { default: { create: () => instance } };
});

const mockRefreshTokenRequest = vi.fn();
vi.mock("./authentication/request/refreshTokenRequest", () => ({
    default: (...args: unknown[]) => mockRefreshTokenRequest(...args)
}));

const mockReportHandledFailure = vi.fn();
vi.mock("../lib/telemetry", () => ({
    reportHandledFailure: (...args: unknown[]) => mockReportHandledFailure(...args)
}));

vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));
vi.mock("i18next", () => ({ default: { t: (key: string) => key } }));

import "./axiosConfig";

/** The 401 the user's own request came back with. */
const unauthorized = () => ({
    config: { url: "/habits", headers: {} },
    response: { status: 401 }
});

/** What the refresh call rejects with when the server answered. */
const refreshAnswered = (status: number) => ({
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    config: { url: "/auth/refresh" },
    response: { status }
});

beforeEach(() => {
    mockRefreshTokenRequest.mockReset();
    mockReportHandledFailure.mockReset();
    // The catch block navigates; jsdom cannot, so give it a writable stand-in.
    Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
        configurable: true
    });
});

const runInterceptor = async (error: unknown) => {
    expect(captured.onRejected).toBeTypeOf("function");
    return captured.onRejected!(error);
};

describe("axios response interceptor — refresh failures", () => {
    test("a 5xx from the refresh endpoint is reported to the collector", async () => {
        mockRefreshTokenRequest.mockRejectedValue(refreshAnswered(503));

        const original = unauthorized();
        await expect(runInterceptor(original)).rejects.toBe(original);

        expect(mockReportHandledFailure).toHaveBeenCalledTimes(1);
        const [reported] = mockReportHandledFailure.mock.calls[0];
        expect(reported).toBeInstanceOf(ApiError);
        expect((reported as ApiError).status).toBe(503);
    });

    test("a 401 from the refresh endpoint is not reported — an expired session is routine", async () => {
        mockRefreshTokenRequest.mockRejectedValue(refreshAnswered(401));

        const original = unauthorized();
        await expect(runInterceptor(original)).rejects.toBe(original);

        expect(mockReportHandledFailure).not.toHaveBeenCalled();
    });

    test("a refresh that never reaches the server is reported", async () => {
        // No `response` — DNS failure, connection refused, CORS or TLS.
        mockRefreshTokenRequest.mockRejectedValue(
            Object.assign(new Error("Network Error"), { isAxiosError: true })
        );

        const original = unauthorized();
        await expect(runInterceptor(original)).rejects.toBe(original);

        expect(mockReportHandledFailure).toHaveBeenCalledTimes(1);
    });

    test("a refresh that answers 200 with no token is reported", async () => {
        mockRefreshTokenRequest.mockResolvedValue({ headers: {} });

        const original = unauthorized();
        await expect(runInterceptor(original)).rejects.toBe(original);

        expect(mockReportHandledFailure).toHaveBeenCalledTimes(1);
    });

    test("a successful refresh reports nothing", async () => {
        mockRefreshTokenRequest.mockResolvedValue({ headers: { "x-access-token": "fresh" } });

        await runInterceptor(unauthorized()).catch(() => undefined);

        expect(mockReportHandledFailure).not.toHaveBeenCalled();
    });

    test("a 4xx that is not a 401 never touches the refresh endpoint", async () => {
        const forbidden = { config: { url: "/habits", headers: {} }, response: { status: 403 } };

        await expect(runInterceptor(forbidden)).rejects.toBe(forbidden);

        expect(mockRefreshTokenRequest).not.toHaveBeenCalled();
        expect(mockReportHandledFailure).not.toHaveBeenCalled();
    });
});
