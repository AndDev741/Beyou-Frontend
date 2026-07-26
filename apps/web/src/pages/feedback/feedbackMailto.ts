import type { TFunction } from "i18next";
import type { FeedbackCategory, FeedbackContext } from "@beyou/api/feedback/feedbackTypes";

/**
 * KD6: the `mailto:` is an ALTERNATIVE EXIT, not an inbound pipeline. Nothing
 * parses what lands in this mailbox — it exists so a user whose submission
 * could not reach the server still has a way out that costs them one click.
 */
export const FEEDBACK_EMAIL =
    (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined) || "support@beyou.app";

export const FEEDBACK_CATEGORY_LABEL_KEYS: Record<FeedbackCategory, string> = {
    BUG: "FeedbackCategoryBug",
    FEATURE_REQUEST: "FeedbackCategoryFeature",
    OTHER: "FeedbackCategoryOther"
};

type MailtoInput = {
    category?: FeedbackCategory | "";
    body: string;
    context?: FeedbackContext;
    t: TFunction;
    email?: string;
};

const formatContext = (context?: FeedbackContext): string => {
    if (!context) return "";
    return Object.entries(context)
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => `${key}=${value}`)
        .join(" · ");
};

/**
 * Builds a `mailto:` that already carries the category, the automatic capture
 * context and whatever the user typed, so the email the user sends is the same
 * report the API would have received.
 */
export const buildFeedbackMailtoHref = ({
    category,
    body,
    context,
    t,
    email = FEEDBACK_EMAIL
}: MailtoInput): string => {
    const categoryLabel = category ? t(FEEDBACK_CATEGORY_LABEL_KEYS[category]) : "";
    const subject = t("FeedbackMailSubject", { category: categoryLabel });

    const contextLine = formatContext(context);
    const lines = [
        `${t("FeedbackMailCategoryLine")}: ${categoryLabel}`,
        ...(contextLine ? [`${t("FeedbackMailContextLine")}: ${contextLine}`] : []),
        "",
        body
    ];

    // Hand-rolled rather than URLSearchParams: that encodes spaces as "+", and
    // RFC 6068 mailto readers show a literal "+" instead of a space.
    const query = [
        `subject=${encodeURIComponent(subject)}`,
        `body=${encodeURIComponent(lines.join("\n"))}`
    ].join("&");

    return `mailto:${email}?${query}`;
};
