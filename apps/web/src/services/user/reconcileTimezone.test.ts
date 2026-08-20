import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import type { UserType } from "@beyou/types/user/UserType";

vi.mock("@beyou/api/user/editUser", () => ({ default: vi.fn() }));

import editUser from "@beyou/api/user/editUser";
import { reconcileTimezone, detectTimezone } from "./reconcileTimezone";

const editUserMock = vi.mocked(editUser);

/**
 * A dispatch the function accepts and the test can assert on. `vi.fn()` alone infers
 * `Mock<any[], unknown>`, which is not assignable to `Dispatch<UnknownAction>` — vitest
 * does not typecheck, so that only surfaces in `tsc`.
 */
type MockDispatch = Dispatch<UnknownAction> & ReturnType<typeof vi.fn>;

/** A profile carrying only what the reconcile reads. */
function profile(overrides: Partial<UserType>): UserType {
    return {
        timezone: "UTC",
        timezoneSource: "DEFAULT",
        ...overrides,
    } as UserType;
}

function mockBrowserZone(zone: string | null) {
    if (zone === null) {
        vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
            throw new Error("Intl unavailable");
        });
        return;
    }
    vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
        resolvedOptions: () => ({ timeZone: zone }),
    } as unknown as Intl.DateTimeFormat);
}

describe("reconcileTimezone", () => {
    let dispatch: MockDispatch;

    beforeEach(() => {
        dispatch = vi.fn() as unknown as MockDispatch;
        editUserMock.mockReset();
        editUserMock.mockResolvedValue({ data: {} as UserType });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("adopts the browser zone when the account never had one", async () => {
        mockBrowserZone("Europe/Lisbon");

        await reconcileTimezone(dispatch, profile({ timezone: "UTC", timezoneSource: "DEFAULT" }));

        expect(editUserMock).toHaveBeenCalledWith({
            timezone: "Europe/Lisbon",
            timezoneSource: "DETECTED",
        });
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    it("leaves a zone a person picked alone", async () => {
        // The user chose UTC on purpose. A browser saying otherwise is not a reason to
        // move every day boundary this account has ever written against.
        mockBrowserZone("Europe/Lisbon");

        await reconcileTimezone(dispatch, profile({ timezone: "UTC", timezoneSource: "EXPLICIT" }));

        expect(editUserMock).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it("does not re-adopt over a zone a client already detected", async () => {
        // The travelling case: a laptop opened abroad must not silently move the day
        // boundary. The settings screen offers it as a suggestion instead.
        mockBrowserZone("America/Sao_Paulo");

        await reconcileTimezone(
            dispatch, profile({ timezone: "Europe/Lisbon", timezoneSource: "DETECTED" }));

        expect(editUserMock).not.toHaveBeenCalled();
    });

    it("stays quiet when the stored zone is already right", async () => {
        mockBrowserZone("Europe/Lisbon");

        await reconcileTimezone(
            dispatch, profile({ timezone: "Europe/Lisbon", timezoneSource: "DEFAULT" }));

        expect(editUserMock).not.toHaveBeenCalled();
    });

    it("stays quiet when the browser cannot report a zone", async () => {
        mockBrowserZone(null);

        await reconcileTimezone(dispatch, profile({ timezone: "UTC", timezoneSource: "DEFAULT" }));

        expect(editUserMock).not.toHaveBeenCalled();
    });

    it("swallows a rejected edit and leaves the slice untouched", async () => {
        // editUser returns a result object rather than throwing. Either way this runs on
        // the boot path and must never be the reason a boot fails.
        mockBrowserZone("Europe/Lisbon");
        editUserMock.mockResolvedValue({ error: { errorKey: "INVALID_REQUEST" } });

        await expect(
            reconcileTimezone(dispatch, profile({ timezoneSource: "DEFAULT" }))
        ).resolves.toBeUndefined();

        expect(dispatch).not.toHaveBeenCalled();
    });

    it("swallows a thrown edit too", async () => {
        mockBrowserZone("Europe/Lisbon");
        editUserMock.mockRejectedValue(new Error("network down"));

        await expect(
            reconcileTimezone(dispatch, profile({ timezoneSource: "DEFAULT" }))
        ).resolves.toBeUndefined();

        expect(dispatch).not.toHaveBeenCalled();
    });

    it("tolerates a profile with no source at all", async () => {
        // A response from a backend that predates the field. Absent is not DEFAULT, and
        // guessing would mean writing to an account we know nothing about.
        mockBrowserZone("Europe/Lisbon");

        await reconcileTimezone(dispatch, profile({ timezoneSource: undefined as never }));

        expect(editUserMock).not.toHaveBeenCalled();
    });
});

describe("detectTimezone", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns the browser zone", () => {
        mockBrowserZone("America/Sao_Paulo");
        expect(detectTimezone()).toBe("America/Sao_Paulo");
    });

    it("returns null rather than throwing when Intl is unavailable", () => {
        mockBrowserZone(null);
        expect(detectTimezone()).toBeNull();
    });
});
