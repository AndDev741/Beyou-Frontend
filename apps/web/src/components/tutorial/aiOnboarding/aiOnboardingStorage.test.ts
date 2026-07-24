import { describe, test, expect, beforeEach } from "vitest";
import {
    clearWizardProgress,
    loadWizardProgress,
    saveWizardProgress,
    StoredWizardProgress
} from "./aiOnboardingStorage";

const progress: StoredWizardProgress = {
    step: "habitsTasks",
    data: {
        categories: [{ id: "c-1", name: "Health" }],
        habits: [],
        tasks: [],
        goals: [],
        freeTexts: ["something calm"]
    }
};

describe("aiOnboardingStorage", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test("round-trips progress", () => {
        saveWizardProgress(progress);
        expect(loadWizardProgress()).toEqual(progress);
    });

    test("returns null when nothing stored", () => {
        expect(loadWizardProgress()).toBeNull();
    });

    test("rejects corrupted JSON", () => {
        window.localStorage.setItem("beyou.aiOnboarding.progress", "{not json");
        expect(loadWizardProgress()).toBeNull();
    });

    test("rejects an unknown step", () => {
        window.localStorage.setItem(
            "beyou.aiOnboarding.progress",
            JSON.stringify({ ...progress, step: "teleport" })
        );
        expect(loadWizardProgress()).toBeNull();
    });

    test("rejects a past-categories step with no created categories", () => {
        window.localStorage.setItem(
            "beyou.aiOnboarding.progress",
            JSON.stringify({
                ...progress,
                data: { ...progress.data, categories: [] }
            })
        );
        expect(loadWizardProgress()).toBeNull();
    });

    test("rejects malformed refs", () => {
        window.localStorage.setItem(
            "beyou.aiOnboarding.progress",
            JSON.stringify({
                ...progress,
                data: { ...progress.data, habits: [{ id: 42 }] }
            })
        );
        expect(loadWizardProgress()).toBeNull();
    });

    test("clear removes stored progress", () => {
        saveWizardProgress(progress);
        clearWizardProgress();
        expect(loadWizardProgress()).toBeNull();
    });
});
