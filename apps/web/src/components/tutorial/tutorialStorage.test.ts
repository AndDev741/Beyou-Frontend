import { beforeEach, describe, expect, test } from "vitest";
import { clearTutorialPhase, getTutorialPhase, setTutorialPhase } from "./tutorialStorage";

describe("tutorialStorage", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test("returns null when no phase is stored", () => {
        expect(getTutorialPhase()).toBeNull();
    });

    test("returns stored phase when valid", () => {
        setTutorialPhase("dashboard");
        expect(getTutorialPhase()).toBe("dashboard");
    });

    test("returns null for unknown phase", () => {
        window.localStorage.setItem("beyou.tutorial.phase", "unknown");
        expect(getTutorialPhase()).toBeNull();
    });

    test("clears stored phase", () => {
        setTutorialPhase("categories");
        clearTutorialPhase();
        expect(getTutorialPhase()).toBeNull();
    });
});
