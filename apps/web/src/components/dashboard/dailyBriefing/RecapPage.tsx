import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import type { DailyBriefing } from "@beyou/types/briefing/briefing";
import type { MoodEntry } from "@beyou/types/mood/mood";
import NarrativeLines from "./NarrativeLines";
import YesterdayMood from "./YesterdayMood";

type Props = {
    briefing: DailyBriefing;
    /** Yesterday's mood entry, journal included, read by the carousel from the mood API. */
    moodYesterday: MoodEntry | undefined;
};

/**
 * How yesterday actually went.
 *
 * Built as a short list of true sentences rather than as a stat block. The numbers already
 * live in the summary above the left panel, and repeating them as tiles would make the
 * dialog feel like a report about the user instead of a note to them.
 *
 * A finished day says so and stops. Nothing about a good day needs three supporting metrics.
 */
export default function RecapPage({ briefing, moodYesterday }: Props) {
    const { t } = useTranslation();
    const { yesterday } = briefing;

    const lines: string[] = [];
    if (yesterday.complete) {
        lines.push(t("BriefingRecapComplete"));
    }
    lines.push(
        yesterday.xpEarned >= 1
            ? t("BriefingRecapXp", { xp: Math.round(yesterday.xpEarned) })
            : t("BriefingRecapNoXp"),
    );
    if (yesterday.openItems.length > 0) {
        lines.push(t("BriefingRecapMissed", { count: yesterday.openItems.length }));
    }
    if (yesterday.focusCycles > 0) {
        lines.push(t("BriefingRecapFocus", { count: yesterday.focusCycles }));
    }

    return (
        <div data-testid="briefing-recap-page">
            <div className="flex items-center gap-2">
                <History size={15} className="shrink-0 text-text-3" aria-hidden="true" />
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-text">
                    {t("BriefingRecapHeading")}
                </h3>
            </div>

            {yesterday.hadRoutine ? (
                <ul className="mt-2 flex flex-col gap-1">
                    {lines.map((line) => (
                        <li key={line} className="text-sm text-text-2">
                            {line}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-sm text-text-2">{t("BriefingNoRoutineBody")}</p>
            )}

            <NarrativeLines
                narrative={briefing.narrative}
                lines={briefing.narrative.yesterdayLines}
            />

            {/* After the prose on purpose: the summary is about the week, and this is the
                user's own account of one day of it. */}
            <YesterdayMood entry={moodYesterday} />
        </div>
    );
}
