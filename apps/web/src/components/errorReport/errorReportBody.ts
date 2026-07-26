import type { TFunction } from "i18next";
import { FEEDBACK_BODY_MAX_LENGTH } from "../../pages/feedback/feedbackSchema";

export type ErrorReportBodyInput = {
    /** Optional free text the user added on top of the automatic details. */
    note?: string;
    /** The failure as the user saw it. Always present in the report. */
    errorText: string;
    /** React component stack — crash-boundary path only. */
    componentStack?: string | null;
    t: TFunction;
};

/**
 * R9: the error text and the technical detail travel with the report whether or
 * not a screenshot was captured, so a report is never just "it broke".
 */
export const buildErrorReportBody = ({
    note,
    errorText,
    componentStack,
    t
}: ErrorReportBodyInput): string => {
    const trimmedError = errorText.trim();
    const trimmedStack = componentStack?.trim();

    const sections = [
        note?.trim(),
        `${t("FeedbackReportErrorLabel")}: ${trimmedError || t("UnexpectedError")}`,
        trimmedStack ? `${t("FeedbackReportStackLabel")}:\n${trimmedStack}` : undefined
    ].filter((section): section is string => Boolean(section));

    const body = sections.join("\n\n");

    // The API rejects anything past 4000 characters. A long component stack has
    // to cost its own tail, never the whole submission.
    return body.length > FEEDBACK_BODY_MAX_LENGTH
        ? `${body.slice(0, FEEDBACK_BODY_MAX_LENGTH - 1)}…`
        : body;
};
