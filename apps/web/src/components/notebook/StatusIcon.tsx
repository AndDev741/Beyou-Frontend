import type { NotebookStatus } from "@beyou/types/notebook/notebook";
import { useTranslation } from "react-i18next";

/**
 * A page's status as a glyph: a filled check when done, a half-filled ring while studying, an
 * empty ring before. The shape carries the meaning as well as the colour, so the three still read
 * apart for someone who cannot tell green from blue.
 */
export default function StatusIcon({ status, size = 16 }: { status: NotebookStatus; size?: number }) {
    const { t } = useTranslation();
    const label = t(STATUS_LABEL_KEY[status]);
    if (status === "DONE") {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
                <circle cx="12" cy="12" r="10" className="fill-success" />
                <path d="m8 12.5 2.7 2.7L16.5 9.5" fill="none" className="stroke-on-accent" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (status === "STUDYING") {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
                <circle cx="12" cy="12" r="9" fill="none" className="stroke-accent" strokeWidth="2.6" />
                <path d="M12 3a9 9 0 0 1 0 18z" className="fill-accent" />
            </svg>
        );
    }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
            <circle cx="12" cy="12" r="9" fill="none" className="stroke-text-3" strokeWidth="2.4" />
        </svg>
    );
}

export const STATUS_LABEL_KEY: Record<NotebookStatus, string> = {
    TO_STUDY: "NotebookStatusToStudy",
    STUDYING: "NotebookStatusStudying",
    DONE: "NotebookStatusDone",
};
