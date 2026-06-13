export type TutorialPhase =
    | "intro"
    | "dashboard"
    | "categories"
    | "habits-dashboard"
    | "habits"
    | "routines-dashboard"
    | "routines"
    | "routines-summary"
    | "config-dashboard"
    | "config"
    | "done";

const STORAGE_KEY = "beyou.tutorial.phase";

export const getTutorialPhase = (): TutorialPhase | null => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (
        raw === "intro" ||
        raw === "dashboard" ||
        raw === "categories" ||
        raw === "habits-dashboard" ||
        raw === "habits" ||
        raw === "routines-dashboard" ||
        raw === "routines" ||
        raw === "routines-summary" ||
        raw === "config-dashboard" ||
        raw === "config" ||
        raw === "done"
    ) {
        return raw;
    }
    return null;
};

export const setTutorialPhase = (phase: TutorialPhase) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, phase);
};

export const clearTutorialPhase = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
};
