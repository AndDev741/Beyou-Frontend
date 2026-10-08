import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { moodLabelKey } from "@beyou/state";
import type { MoodEntry } from "@beyou/types/mood/mood";
import { MOOD_FACES } from "../../mood/moodScale";

type Props = {
    /** Yesterday's entry from the shared mood slice, or undefined when none was logged. */
    entry: MoodEntry | undefined;
};

/** Past this many characters the journal is clamped behind "Read all". */
const CLAMP_AT = 220;

/**
 * Yesterday's mood, and what the user wrote about the day.
 *
 * Read from the mood API by the client, never from the briefing payload. That is the whole
 * privacy story in one line: the server's briefing never handles the journal, so the model
 * that writes the summary cannot see it, and the small print under the text says so. The
 * user reads their own words here because this is the morning they are looking back on.
 *
 * Long entries are clamped. The recap page is a glance, and a thousand words of last night
 * would push everything else off it.
 */
export default function YesterdayMood({ entry }: Props) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    if (!entry) return null;

    const { Icon, text } = MOOD_FACES[entry.mood];
    const note = entry.note?.trim() ?? "";
    const long = note.length > CLAMP_AT;

    return (
        <section className="mt-4 rounded-control border border-border bg-surface p-3" data-testid="briefing-mood-yesterday">
            <div className="flex items-center gap-2">
                <Icon size={18} className={`shrink-0 ${text}`} aria-hidden="true" />
                <span className="text-sm font-medium text-text">
                    {t("BriefingYesterdayMood", { mood: t(moodLabelKey(entry.mood)) })}
                </span>
            </div>

            {note && (
                <>
                    <p
                        className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-text-2 ${
                            long && !expanded ? "line-clamp-4" : ""
                        }`}
                        data-testid="briefing-journal"
                    >
                        {note}
                    </p>
                    {long && (
                        <button
                            type="button"
                            onClick={() => setExpanded((value) => !value)}
                            aria-expanded={expanded}
                            className="mt-1 rounded-control text-xs font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {expanded ? t("BriefingJournalShowLess") : t("BriefingJournalReadAll")}
                        </button>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-3">
                        <Lock size={11} className="shrink-0" aria-hidden="true" />
                        {t("BriefingJournalPrivate")}
                    </p>
                </>
            )}
        </section>
    );
}
