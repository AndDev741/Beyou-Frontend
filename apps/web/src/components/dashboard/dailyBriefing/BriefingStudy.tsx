import { useTranslation } from "react-i18next";
import { Repeat } from "lucide-react";
import { briefingStudy, briefingStudyRecap, formatStudyMinutes } from "@beyou/state";
import type { BriefingStudyEntry, DailyBriefing } from "@beyou/types/briefing/briefing";

/**
 * Today's study cycles in the briefing: per cycle, when it starts, how long, and its first blocks
 * in a sentence, with yesterday's study in one line beside the heading.
 *
 * Renders nothing for a server that predates the study cycle, or on a day with no study.
 *
 * No link out to the notebook on purpose: the dialog is closed through its own buttons, which is
 * what records that the person saw it. A link that navigated away would leave it unseen and it
 * would open again on the next dashboard visit.
 */
export default function BriefingStudy({ briefing, locale }: { briefing: DailyBriefing; locale: string }) {
    const { t } = useTranslation();
    const study = briefingStudy(briefing);
    if (study.length === 0) return null;

    const recap = briefingStudyRecap(briefing);
    const total = study.reduce((sum, cycle) => sum + cycle.minutes, 0);
    const list = new Intl.ListFormat(locale, { type: "conjunction" });
    const entryText = (entry: BriefingStudyEntry) =>
        entry.mode === "GOAL" ? entry.title : t("BriefingStudyTimeEntry", { minutes: formatStudyMinutes(entry.minutesToday), title: entry.title });

    return (
        <section aria-labelledby="briefing-study-title" data-testid="briefing-study"
            className="mt-4 flex flex-col gap-2.5 rounded-control border border-accent/30 bg-accent/5 p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h4 id="briefing-study-title" className="flex items-center gap-2 text-sm font-semibold text-text">
                    <Repeat size={14} className="shrink-0 text-accent" aria-hidden="true" />
                    {t("BriefingStudyHeading", { minutes: formatStudyMinutes(total) })}
                </h4>
                {recap && (
                    <span className="text-[11.5px] text-text-2" data-testid="briefing-study-yesterday">
                        {recap.understood > 0
                            ? t("BriefingStudyYesterday", { count: recap.understood, minutes: formatStudyMinutes(recap.minutes) })
                            : t("BriefingStudyYesterdayMinutes", { minutes: formatStudyMinutes(recap.minutes) })}
                    </span>
                )}
            </div>
            {study.map((cycle) => (
                <div key={cycle.cycleName} className="flex gap-3 text-sm" data-testid="briefing-study-cycle">
                    <span className="w-11 shrink-0 pt-0.5 font-mono text-xs font-semibold text-text-2">{cycle.startTime ?? ""}</span>
                    <span className="min-w-0 flex-1 leading-5 text-text">
                        {cycle.entries.length > 0
                            ? t("BriefingStudyCycleLine", {
                                  cycle: cycle.cycleName,
                                  minutes: formatStudyMinutes(cycle.minutes),
                                  entries: list.format(cycle.entries.map(entryText)),
                              })
                            : t("BriefingStudyCycleOnly", { cycle: cycle.cycleName, minutes: formatStudyMinutes(cycle.minutes) })}
                    </span>
                </div>
            ))}
        </section>
    );
}
