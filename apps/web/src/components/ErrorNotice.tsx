import { useTranslation } from "react-i18next";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import ErrorReportControl from "./errorReport/ErrorReportControl";
import ReportControlGuard from "./errorReport/ReportControlGuard";

type ErrorNoticeProps = {
    error?: ApiErrorPayload | null;
    className?: string;
    /**
     * R8: every error state offers a way to turn the failure into a bug report.
     * Set `false` where the report control would recurse (the control renders
     * its own failure) or where the surface is not a real failure.
     */
    canReport?: boolean;
};

export default function ErrorNotice({ error, className = "", canReport = true }: ErrorNoticeProps) {
    const { t } = useTranslation();

    if (!error) return null;

    const friendlyMessage = getFriendlyErrorMessage(t, error);
    // The raw key is what a maintainer greps for; the friendly text is what the
    // user saw. Send both, without repeating an untranslated key twice.
    const reportText =
        error.errorKey && error.errorKey !== friendlyMessage
            ? `${error.errorKey}: ${friendlyMessage}`
            : friendlyMessage;

    return (
        <div className={`text-error text-sm ${className}`}>
            <p>{friendlyMessage}</p>
            {canReport && (
                <ReportControlGuard>
                    {/* KTD3: the screen is intact here, so the capture runs. */}
                    <ErrorReportControl errorText={reportText} captureScreen />
                </ReportControlGuard>
            )}
        </div>
    );
}
