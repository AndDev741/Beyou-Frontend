import { vi } from "vitest";
import { clearLocalAccountState, tearDownAndLeave } from "../accountTeardown";

const purge = vi.fn();

vi.mock("../../../redux/store", async () => {
    const actual = await vi.importActual<typeof import("../../../redux/store")>("../../../redux/store");
    return { ...actual, persistor: { purge: () => purge() } };
});

/**
 * The browser-side half of leaving.
 *
 * `persistor.purge()` was the whole teardown for a while, which looks complete and
 * is not: the tutorial phase and the AI onboarding wizard's progress are written
 * straight to localStorage, outside redux entirely. Nothing breaks when they survive
 * — that is exactly why it went unnoticed — the next person to open the browser just
 * inherits a deleted stranger's half-walked onboarding.
 */
describe("clearLocalAccountState", () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
        purge.mockReset().mockResolvedValue(undefined);
    });

    it("takes every key this app wrote, including ones added after it was written", () => {
        window.localStorage.setItem("beyou.tutorial.phase", "categories");
        window.localStorage.setItem("beyou.aiOnboarding.progress", '{"step":"goals"}');
        window.localStorage.setItem("beyou-goal-horizons", "{}");
        window.localStorage.setItem("beyou-routine-collapsed", "{}");
        // Not a key any current code writes. The sweep is by prefix precisely so that
        // the next one somebody adds is covered without this file being touched.
        window.localStorage.setItem("beyou.something.nobody.has.written.yet", "x");

        clearLocalAccountState();

        expect(window.localStorage.length).toBe(0);
    });

    it("leaves the theme alone", () => {
        window.localStorage.setItem("beyou-theme", "beYouDark");
        window.localStorage.setItem("beyou.tutorial.phase", "intro");

        clearLocalAccountState();

        // How this machine is set up, not something the deleted account owned. Resetting
        // someone's dark mode on the way out is a strange parting gesture.
        expect(window.localStorage.getItem("beyou-theme")).toBe("beYouDark");
        expect(window.localStorage.getItem("beyou.tutorial.phase")).toBeNull();
    });

    it("does not touch keys belonging to anything else on this origin", () => {
        window.localStorage.setItem("some-other-app", "keep me");

        clearLocalAccountState();

        expect(window.localStorage.getItem("some-other-app")).toBe("keep me");
    });

    it("survives storage being unavailable", () => {
        const broken = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
            throw new Error("quota");
        });
        window.localStorage.setItem("beyou.tutorial.phase", "intro");

        // A browser with storage disabled must not be the reason someone is left
        // sitting inside an account that no longer exists.
        expect(() => clearLocalAccountState()).not.toThrow();
        broken.mockRestore();
    });
});

describe("tearDownAndLeave", () => {
    beforeEach(() => {
        window.localStorage.clear();
        purge.mockReset().mockResolvedValue(undefined);
    });

    it("leaves even when the purge fails", async () => {
        purge.mockRejectedValue(new Error("indexeddb is having a day"));

        await tearDownAndLeave();

        // The account is already gone by this point. Staying on a configuration page
        // that belongs to it is the worse of the two outcomes, so the redirect is in a
        // finally and this assertion is what keeps it there.
        expect(window.location.href).toContain("/");
    });
});
