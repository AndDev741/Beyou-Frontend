import { describe, test, expect } from "vitest";
import { buildFeedbackContext, FEEDBACK_CONTEXT_FIELD_MAX_LENGTH } from "./feedbackContext";

describe("buildFeedbackContext", () => {
  // The helper ships in a package consumed by React Native, where `window` and
  // `document` do not exist. The vitest environment for this package is `node`,
  // so this assertion documents that the tests below genuinely run without them.
  test("runs on a platform with no window/document", () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof globalThis.document).toBe("undefined");

    expect(buildFeedbackContext({ platform: "web" })).toEqual({ platform: "web" });
  });

  test("reports every field a web caller injects", () => {
    const context = buildFeedbackContext({
      screen: "/dashboard",
      appVersion: "1.4.2",
      platform: "web",
      language: "pt",
      theme: "beYouDark",
    });

    expect(context).toEqual({
      screen: "/dashboard",
      appVersion: "1.4.2",
      platform: "web",
      language: "pt",
      theme: "beYouDark",
    });
  });

  test("reports every field a React Native caller injects", () => {
    const context = buildFeedbackContext({
      screen: "HabitsScreen",
      appVersion: "1.4.2 (42)",
      platform: "android",
      language: "en",
      theme: "midnight",
    });

    expect(context).toEqual({
      screen: "HabitsScreen",
      appVersion: "1.4.2 (42)",
      platform: "android",
      language: "en",
      theme: "midnight",
    });
  });

  test("drops blank, whitespace-only, null and undefined fields", () => {
    const context = buildFeedbackContext({
      screen: "   ",
      appVersion: undefined,
      platform: "ios",
      language: null,
      theme: "",
    });

    expect(context).toEqual({ platform: "ios" });
  });

  test("trims surrounding whitespace", () => {
    expect(buildFeedbackContext({ screen: "  /goals  " })).toEqual({ screen: "/goals" });
  });

  test("returns undefined when nothing was collected", () => {
    expect(buildFeedbackContext({})).toBeUndefined();
    expect(buildFeedbackContext({ screen: "", theme: null })).toBeUndefined();
  });

  test("truncates over-long values so a runaway route name cannot fail the request", () => {
    const context = buildFeedbackContext({ screen: "x".repeat(500) });

    expect(context?.screen).toHaveLength(FEEDBACK_CONTEXT_FIELD_MAX_LENGTH);
  });
});
