import type { FeedbackContext } from "./feedbackTypes";

/**
 * Guards against a runaway route name or user-agent-ish string blowing past the
 * backend column and turning an otherwise-valid submission into a 400.
 */
export const FEEDBACK_CONTEXT_FIELD_MAX_LENGTH = 200;

/**
 * Everything is injected rather than sniffed from globals: this package runs on
 * both web and React Native, where `window`, `document` and `navigator` are not
 * interchangeable (and two of the three do not exist at all on RN). Reading them
 * here would make the helper platform-specific — which is exactly what it exists
 * to avoid.
 */
export type FeedbackContextInput = {
  /** Web: the router pathname. React Native: the active route name. */
  screen?: string | null;
  /** Web: build-time version constant. React Native: the app/build version. */
  appVersion?: string | null;
  /** `"web"`, `"ios"` or `"android"`. */
  platform?: string | null;
  /** Active i18next language (`"en"` / `"pt"`). */
  language?: string | null;
  /** Active theme id (`"beYou"`, `"beYouDark"`, …). */
  theme?: string | null;
};

const normalize = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, FEEDBACK_CONTEXT_FIELD_MAX_LENGTH);
};

/**
 * Builds the automatic capture context both apps send, so web and mobile report
 * the same fields in the same shape. Blank fields are dropped; when nothing was
 * collected the result is `undefined` so the request omits `context` entirely
 * rather than sending an empty object.
 */
export const buildFeedbackContext = (input: FeedbackContextInput): FeedbackContext | undefined => {
    const context: FeedbackContext = {};

    const screen = normalize(input.screen);
    if (screen) context.screen = screen;

    const appVersion = normalize(input.appVersion);
    if (appVersion) context.appVersion = appVersion;

    const platform = normalize(input.platform);
    if (platform) context.platform = platform;

    const language = normalize(input.language);
    if (language) context.language = language;

    const theme = normalize(input.theme);
    if (theme) context.theme = theme;

    return Object.keys(context).length > 0 ? context : undefined;
};

export default buildFeedbackContext;
