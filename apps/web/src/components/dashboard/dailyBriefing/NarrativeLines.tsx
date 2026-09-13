import { useTranslation } from "react-i18next";
import type { BriefingNarrative } from "@beyou/types/briefing/briefing";

type Props = {
    narrative: BriefingNarrative;
    lines: string[];
};

/**
 * The generated prose, or an honest stand-in for it.
 *
 * Three states, and the reason they are all quiet is that none of them is important. The
 * facts around this block are computed on the server and always right; these two sentences
 * are the nice-to-have. A loud error where prose should be would tell the user something is
 * broken when nothing is.
 *
 * PENDING shimmers, because the model may still be writing and the answer usually arrives by
 * the next open. UNAVAILABLE says so in one line and stops. READY with nothing in it renders
 * nothing at all rather than an empty box.
 */
export default function NarrativeLines({ narrative, lines }: Props) {
    const { t } = useTranslation();

    if (lines.length > 0) {
        return (
            <div className="mt-3 flex flex-col gap-1.5" data-testid="briefing-narrative">
                {lines.map((line) => (
                    <p key={line} className="text-sm leading-relaxed text-text-2">
                        {line}
                    </p>
                ))}
            </div>
        );
    }

    if (narrative.status === "PENDING") {
        return (
            <div
                className="mt-3 flex flex-col gap-2"
                aria-label={t("BriefingNarrativeLoading")}
                aria-busy="true"
                data-testid="briefing-narrative-pending"
            >
                {/* Skeleton shaped like the two lines it stands in for, on the app's own
                    shimmer keyframe, so the block does not resize when the prose lands. */}
                {["w-full", "w-4/5"].map((width) => (
                    <span
                        key={width}
                        className={`relative block h-3.5 overflow-hidden rounded-full bg-surface-2 ${width}`}
                    >
                        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-border to-transparent" />
                    </span>
                ))}
            </div>
        );
    }

    if (narrative.status === "UNAVAILABLE") {
        return (
            <p
                className="mt-3 text-xs leading-relaxed text-text-3"
                data-testid="briefing-narrative-unavailable"
            >
                {t("BriefingNarrativeUnavailable")}
            </p>
        );
    }

    return null;
}
