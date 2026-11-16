import { useId } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, CalendarDays, Lock, NotebookPen, Smile, StickyNote, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SECOND_BRAIN_SOURCE_TEXT } from "@beyou/state";
import type { SecondBrainSource, SecondBrainSourceState } from "@beyou/types/secondBrain/secondBrain";
import Block from "./Block";

type SourcesBlockProps = {
    sources: SecondBrainSourceState[];
    /** The source whose switch is waiting on the server, so it cannot be pressed twice. */
    pending: SecondBrainSource | null;
    onToggle: (source: SecondBrainSource, enabled: boolean) => void;
};

/** The icon per source. The names and descriptions are shared with the phone app. */
const SOURCE_ICON: Record<SecondBrainSource, LucideIcon> = {
    ROUTINES: CalendarDays,
    GOALS: Trophy,
    MOOD: Smile,
    CALENDAR: CalendarClock,
    NOTEBOOK: NotebookPen,
    IDEAS: StickyNote,
};

/** The switches for what Second Brain may read. Off means off everywhere on this page. */
export default function SourcesBlock({ sources, pending, onToggle }: SourcesBlockProps) {
    const { t } = useTranslation();
    const baseId = useId();

    return (
        <Block title={t("SecondBrainSourcesTitle")} testId="second-brain-sources">
            <ul className="flex flex-col gap-4">
                {sources.map(({ source, enabled }) => {
                    const meta = SECOND_BRAIN_SOURCE_TEXT[source];
                    const Icon = SOURCE_ICON[source];
                    // A source this build does not know yet is skipped instead of drawn blank.
                    if (!meta || !Icon) return null;
                    const nameId = `${baseId}-${source}`;
                    return (
                        <li key={source} className="flex items-start gap-3">
                            <Icon
                                size={18}
                                aria-hidden="true"
                                className={`mt-0.5 shrink-0 ${enabled ? "text-accent" : "text-text-3"}`}
                            />
                            <div className="min-w-0 flex-1">
                                <p id={nameId} className="text-sm font-semibold text-text">
                                    {t(meta.name)}
                                </p>
                                <p id={`${nameId}-detail`} className="mt-0.5 text-[13px] leading-snug text-text-2">
                                    {t(meta.detail)}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                aria-labelledby={nameId}
                                aria-describedby={`${nameId}-detail`}
                                disabled={pending === source}
                                onClick={() => onToggle(source, !enabled)}
                                data-testid={`second-brain-source-${source}`}
                                className={`flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
                                    enabled ? "justify-end bg-accent" : "justify-start bg-border"
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`h-5 w-5 rounded-full shadow-sm ${enabled ? "bg-on-accent" : "bg-text-3"}`}
                                />
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-[13px] leading-snug text-text-2">
                <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-text-3" />
                {t("SecondBrainSourcesJournal")}
            </p>
        </Block>
    );
}
