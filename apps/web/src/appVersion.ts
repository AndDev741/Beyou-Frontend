/**
 * Build-time constant, injected by Vite's `define` from package.json. Feedback
 * and error reports carry it so a report can be tied back to the build that
 * produced it. Falls back to "dev" when the define is absent (bare tooling runs).
 */
export const APP_VERSION: string =
    typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
