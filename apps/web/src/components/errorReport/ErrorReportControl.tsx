import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bug, Mail } from "lucide-react";
import buildFeedbackContext from "@beyou/api/feedback/feedbackContext";
import submitFeedback from "@beyou/api/feedback/submitFeedback";
import type { FeedbackAttachmentInput, FeedbackContext } from "@beyou/api/feedback/feedbackTypes";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { useTheme } from "../../context/ThemeContext";
import { APP_VERSION } from "../../appVersion";
import { buildFeedbackMailtoHref } from "../../pages/feedback/feedbackMailto";
import { buildErrorReportBody } from "./errorReportBody";
import { captureScreenshot } from "./captureScreenshot";

type Phase =
    | { kind: "idle" }
    | { kind: "composing" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "failed"; error: ApiErrorPayload };

export type ErrorReportControlProps = {
    /** The failure as the user saw it. Always attached to the report. */
    errorText: string;
    /** React component stack. Present on the crash-boundary path only. */
    componentStack?: string | null;
    /**
     * KTD3: automatic capture is bound to intact-DOM paths only. Leave this on
     * for non-fatal surfaces, where the screen that failed is still rendered.
     * Turn it OFF on the crash boundary: React commits the fallback before this
     * control exists, so a capture there photographs the error screen rather
     * than the failure.
     */
    captureScreen?: boolean;
    className?: string;
};

/**
 * R8: turns a failure the user just hit into a submission already categorised
 * as a bug, without sending them anywhere. Optional throughout — declining
 * leaves the error surface exactly as it was.
 */
export default function ErrorReportControl({
    errorText,
    componentStack,
    captureScreen = true,
    className = ""
}: ErrorReportControlProps) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();

    const [phase, setPhase] = useState<Phase>({ kind: "idle" });
    const [note, setNote] = useState("");

    // Read from `window`, not the router: this control also renders on the
    // crash path, where whatever broke may well be the router itself.
    const context: FeedbackContext | undefined = useMemo(
        () =>
            buildFeedbackContext({
                screen: typeof window !== "undefined" ? window.location.pathname : null,
                appVersion: APP_VERSION,
                platform: "web",
                language: i18n.language,
                theme: theme.mode
            }),
        [i18n.language, theme.mode]
    );

    const body = useMemo(
        () => buildErrorReportBody({ note, errorText, componentStack, t }),
        [note, errorText, componentStack, t]
    );

    // R7: the same report, one click away, when the submission cannot land.
    const mailtoHref = useMemo(
        () => buildFeedbackMailtoHref({ category: "BUG", body, context, t }),
        [body, context, t]
    );

    const send = async () => {
        setPhase({ kind: "sending" });

        // R9 / AE1: the capture is an optional extra. A capture that throws,
        // hangs on a tainted canvas or returns nothing must cost the image and
        // nothing else — the report still goes, and the user is told the same
        // thing either way.
        let attachments: FeedbackAttachmentInput[] | undefined;
        if (captureScreen) {
            try {
                const shot = await captureScreenshot();
                if (shot) attachments = [{ blob: shot, name: shot.name }];
            } catch {
                attachments = undefined;
            }
        }

        const result = await submitFeedback(
            {
                category: "BUG",
                body,
                ...(context ? { context } : {}),
                ...(attachments ? { attachments } : {})
            },
            t
        );

        if (result.success) {
            setPhase({ kind: "sent" });
            return;
        }

        setPhase({ kind: "failed", error: result.error ?? { message: t("UnexpectedError") } });
    };

    if (phase.kind === "sent") {
        return (
            <div
                data-testid="error-report-success"
                role="status"
                className={`mt-3 rounded-xl border border-success bg-background p-3 text-left ${className}`}
            >
                <p className="text-sm font-semibold text-success">{t("FeedbackSuccessTitle")}</p>
                <p className="mt-1 text-xs text-description">{t("FeedbackSuccessBody")}</p>
            </div>
        );
    }

    if (phase.kind === "failed") {
        return (
            <div
                data-testid="error-report-failure"
                role="alert"
                className={`mt-3 rounded-xl border border-error bg-background p-3 text-left ${className}`}
            >
                <p className="text-sm font-semibold text-error">{t("FeedbackFailedTitle")}</p>
                <p className="mt-1 text-xs text-description">{t("FeedbackFailedBody")}</p>
                <a
                    data-testid="error-report-mailto-fallback"
                    href={mailtoHref}
                    className="mt-2 inline-flex items-center gap-2 rounded-[20px] border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-background"
                >
                    <Mail size={14} aria-hidden="true" />
                    {t("FeedbackEmailLink")}
                </a>
            </div>
        );
    }

    if (phase.kind === "idle") {
        return (
            <button
                type="button"
                data-testid="error-report-open"
                onClick={() => setPhase({ kind: "composing" })}
                className={`mt-2 inline-flex items-center gap-2 rounded-[20px] border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-background ${className}`}
            >
                <Bug size={14} aria-hidden="true" />
                {t("FeedbackReportProblem")}
            </button>
        );
    }

    const isSending = phase.kind === "sending";

    return (
        <div
            data-error-report-panel=""
            className={`mt-3 rounded-xl border border-primary bg-background p-3 text-left ${className}`}
        >
            <label htmlFor="error-report-note" className="text-xs font-semibold text-secondary">
                {t("FeedbackReportNoteLabel")}
            </label>
            <textarea
                id="error-report-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("FeedbackReportNotePlaceholder")}
                className="mt-1 w-full rounded-lg border border-primary bg-background p-2 text-xs text-secondary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-description">{t("FeedbackReportAttachedHint")}</p>

            <div className="mt-2 flex flex-wrap gap-2">
                <button
                    type="button"
                    data-testid="error-report-submit"
                    onClick={send}
                    disabled={isSending}
                    className="inline-flex items-center gap-2 rounded-[20px] bg-primary px-3 py-1.5 text-xs font-semibold text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
                >
                    {isSending ? t("FeedbackSubmitting") : t("FeedbackReportSend")}
                </button>
                <button
                    type="button"
                    data-testid="error-report-cancel"
                    onClick={() => setPhase({ kind: "idle" })}
                    disabled={isSending}
                    className="inline-flex items-center gap-2 rounded-[20px] border border-description px-3 py-1.5 text-xs font-semibold text-description transition-colors duration-200 hover:border-primary hover:text-primary disabled:opacity-60"
                >
                    {t("FeedbackReportCancel")}
                </button>
            </div>
        </div>
    );
}
