import { describe, test, expect, vi, beforeEach } from "vitest";
import { ApiError, setHttpClient } from "../httpClient";
import getCheckHistory from "./getCheckHistory";

const t = ((key: string) => key) as never;

const payload = {
    ownerType: "USER",
    ownerId: "u1",
    from: "2026-07-17",
    to: "2026-08-13",
    days: [{ day: "2026-07-17", outcome: "DONE" }],
};

describe("getCheckHistory", () => {
    const get = vi.fn();

    beforeEach(() => {
        get.mockReset();
        setHttpClient({ get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as never);
    });

    test("sends only the parameters it was given", async () => {
        get.mockResolvedValue({ data: payload });

        const result = await getCheckHistory({ ownerType: "USER" }, t);

        expect(get).toHaveBeenCalledWith("/check-history", { params: { ownerType: "USER" } });
        expect(result.success?.days).toHaveLength(1);
    });

    test("passes owner and range through when they are named", async () => {
        get.mockResolvedValue({ data: payload });

        await getCheckHistory(
            { ownerType: "HABIT", ownerId: "h1", from: "2026-07-31", to: "2026-08-13" },
            t,
        );

        expect(get).toHaveBeenCalledWith("/check-history", {
            params: { ownerType: "HABIT", ownerId: "h1", from: "2026-07-31", to: "2026-08-13" },
        });
    });

    test("reports the EFFECTIVE range the server answered with, not the requested one", async () => {
        // A range wider than the cap comes back clamped; a client that drew from its
        // own request parameters would render a window it was never sent.
        get.mockResolvedValue({ data: { ...payload, from: "2025-08-14", to: "2026-08-13" } });

        const result = await getCheckHistory({ ownerType: "USER", from: "2020-01-01" }, t);

        expect(result.success?.from).toBe("2025-08-14");
    });

    test("shares one request between identical queries in flight", async () => {
        // The dashboard mounts the widget rail twice (phone carousel + desktop column).
        let resolve: (value: unknown) => void = () => {};
        get.mockReturnValue(new Promise((r) => { resolve = r; }));

        const first = getCheckHistory({ ownerType: "USER" }, t);
        const second = getCheckHistory({ ownerType: "USER" }, t);
        resolve({ data: payload });

        expect(await first).toBe(await second);
        expect(get).toHaveBeenCalledTimes(1);
    });

    test("does not share across different queries, and asks again once settled", async () => {
        get.mockResolvedValue({ data: payload });

        await Promise.all([
            getCheckHistory({ ownerType: "USER" }, t),
            getCheckHistory({ ownerType: "HABIT", ownerId: "h1" }, t),
        ]);
        await getCheckHistory({ ownerType: "USER" }, t);

        expect(get).toHaveBeenCalledTimes(3);
    });

    test("returns a translated error instead of throwing", async () => {
        get.mockRejectedValue(new ApiError(400, { errorKey: "INVALID_REQUEST" }));

        const result = await getCheckHistory({ ownerType: "HABIT" }, t);

        expect(result.error).toBe("UnexpectedError");
        expect(result.success).toBeUndefined();
    });
});
