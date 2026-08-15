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

    /**
     * A rejected purge used to jump straight to the shared catch and skip the local
     * sweep with it, so a browser that could not empty redux also kept the tutorial and
     * the wizard. The two are independent now, and this is the test that says so.
     *
     * The assertion that hid it was `expect(href).toContain("/")`, which is true of
     * every URL there is. Both assertions here name a specific key.
     */
    it("still clears local storage when the purge fails", async () => {
        purge.mockRejectedValue(new Error("indexeddb is having a day"));
        window.localStorage.setItem("beyou.tutorial.phase", "categories");
        window.localStorage.setItem("beyou.aiOnboarding.progress", "{}");

        await tearDownAndLeave();

        expect(window.localStorage.getItem("beyou.tutorial.phase")).toBeNull();
        expect(window.localStorage.getItem("beyou.aiOnboarding.progress")).toBeNull();
    });

    it("clears local storage even when the purge succeeds", async () => {
        window.localStorage.setItem("beyou.tutorial.phase", "habits");

        await tearDownAndLeave();

        expect(purge).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem("beyou.tutorial.phase")).toBeNull();
    });

    it("does not reject when everything fails, since nobody is left to catch it", async () => {
        purge.mockRejectedValue(new Error("nope"));
        const broken = vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
            throw new Error("also nope");
        });

        await expect(tearDownAndLeave()).resolves.toBeUndefined();
        broken.mockRestore();
    });
});
