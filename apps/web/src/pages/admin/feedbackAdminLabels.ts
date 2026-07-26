import type { FeedbackCategory, FeedbackStatus } from "@beyou/api/feedback/feedbackTypes";

export const FEEDBACK_STATUS_ORDER: FeedbackStatus[] = ["OPEN", "TAKING_CARE", "CLOSED"];

export const FEEDBACK_STATUS_LABEL_KEYS: Record<FeedbackStatus, string> = {
    OPEN: "AdminFeedbackStatusOpen",
    TAKING_CARE: "AdminFeedbackStatusTakingCare",
    CLOSED: "AdminFeedbackStatusClosed"
};

export const FEEDBACK_CATEGORY_ORDER: FeedbackCategory[] = ["BUG", "FEATURE_REQUEST", "OTHER"];

/**
 * Theme variables only — a status badge that hardcodes green/amber/grey breaks
 * on 7 of the 9 themes.
 */
export const FEEDBACK_STATUS_BADGE_CLASSES: Record<FeedbackStatus, string> = {
    OPEN: "border-primary text-primary",
    TAKING_CARE: "border-success text-success",
    CLOSED: "border-description text-description"
};

export const FEEDBACK_CONTEXT_LABEL_KEYS = {
    screen: "AdminFeedbackContextScreen",
    appVersion: "AdminFeedbackContextAppVersion",
    platform: "AdminFeedbackContextPlatform",
    language: "AdminFeedbackContextLanguage",
    theme: "AdminFeedbackContextTheme"
} as const;

export type FeedbackContextKey = keyof typeof FEEDBACK_CONTEXT_LABEL_KEYS;

export const FEEDBACK_CONTEXT_ORDER: FeedbackContextKey[] = [
    "screen",
    "appVersion",
    "platform",
    "language",
    "theme"
];

/** Locale-aware, and honest about a missing timestamp instead of printing "Invalid Date". */
export const formatFeedbackTimestamp = (value: string | undefined, language: string): string => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString(language, { dateStyle: "medium", timeStyle: "short" });
};
