import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, ChevronDown, Clock, Moon } from "lucide-react";
import type { BriefingOpenItem, DailyBriefing } from "@beyou/types/briefing/briefing";
import { recoveryIsUrgent } from "@beyou/state";
import OpenItemRow from "./OpenItemRow";

type Props = {
    briefing: DailyBriefing;
    onResolve: (item: BriefingOpenItem, outcome: "checked" | "skipped") => void;
    pendingId: string | null;
    locale: string;
};

/** `Mon 8 Sep` in the user's language, for the older-days deadline lines. */
function shortDate(iso: string, locale: string): string {
    const parsed = new Date(`${iso}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    }).format(parsed);
}

/**
 * The half of the dialog you can act on.
 *
 * Three states, and the difference between the last two is the point. A day with loose ends
 * gets a list. A day that was finished gets told so and nothing else, because that is the
 * result the whole product is about and decorating it would cheapen it. A day no routine
 * covered gets a third, quieter message: nothing was asked, so there is nothing to forgive.
 * Collapsing those two into one "nothing here" state would tell people they succeeded at a
 * day that never existed.
 *
 * Older recoverable days sit behind a disclosure. The panel is about yesterday, and seven
 * days of arrears every morning is how you teach somebody to close a dialog unread.
 */
export default function YesterdayPanel({ briefing, onResolve, pendingId, locale }: Props) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const [olderOpen, setOlderOpen] = useState(false);

    const { yesterday } = briefing;
    const recovery = briefing.today.recovery;
    const urgent = recoveryIsUrgent(briefing);

    const rowMotion = reduceMotion
        ? {}
        : {
              // Exit only. The list is not an entrance, it is a worklist; what deserves
              // motion is the row leaving, because that is the feedback for the tap.
              exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.22 } },
              layout: true,
          };

    return (
        <div className="flex min-w-0 flex-col" data-testid="briefing-yesterday">
            <div className="flex items-center gap-2">
                <CalendarCheck size={15} className="shrink-0 text-text-3" aria-hidden="true" />
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-text">
                    {t("BriefingYesterdayHeading")}
                </h3>
                {yesterday.hadRoutine && (
                    <span className="ml-auto font-mono text-[11px] text-text-3">
                        {t("BriefingYesterdaySummary", {
                            done: yesterday.doneCount,
                            skipped: yesterday.skippedCount,
                        })}
                    </span>
                )}
            </div>

            {!yesterday.hadRoutine ? (
                <EmptyNote
                    icon={<Moon size={18} aria-hidden="true" />}
                    title={t("BriefingNoRoutineTitle")}
                    body={t("BriefingNoRoutineBody")}
                />
            ) : yesterday.openItems.length === 0 ? (
                <EmptyNote
                    icon={<CalendarCheck size={18} aria-hidden="true" />}
                    title={t("BriefingYesterdayEmptyTitle")}
                    body={t("BriefingYesterdayEmptyBody")}
                    tone="success"
                />
            ) : (
                <>
                    <ul className="mt-3 flex flex-col gap-2">
                        <AnimatePresence initial={false}>
                            {yesterday.openItems.map((item) => (
                                <motion.div key={item.snapshotCheckId} {...rowMotion}>
                                    <OpenItemRow
                                        item={item}
                                        busy={pendingId === item.snapshotCheckId}
                                        onCheck={() => onResolve(item, "checked")}
                                        onSkip={() => onResolve(item, "skipped")}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </ul>
                    <p className="mt-2.5 text-xs leading-relaxed text-text-3">
                        {t("BriefingXpDecayNote")}
                    </p>
                </>
            )}

            {recovery && (
                <div className="mt-4 border-t border-border pt-3">
                    <button
                        type="button"
                        onClick={() => setOlderOpen((value) => !value)}
                        aria-expanded={olderOpen}
                        className="flex w-full items-center gap-2 rounded-control px-1 py-1 text-left transition-colors duration-200 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        data-testid="briefing-older-toggle"
                    >
                        <Clock
                            size={14}
                            className={`shrink-0 ${urgent ? "text-flame" : "text-text-3"}`}
                            aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium text-text-2">
                                {t("BriefingOlderDaysToggle", { count: recovery.openItems.length })}
                            </span>
                            <span
                                className={`mt-0.5 block text-[11px] ${
                                    urgent ? "font-medium text-flame" : "text-text-3"
                                }`}
                            >
                                {urgent
                                    ? t("BriefingOlderDaysLastChance", {
                                          date: shortDate(recovery.oldestOpenDay, locale),
                                      })
                                    : t("BriefingOlderDaysDeadline", {
                                          date: shortDate(recovery.oldestOpenDay, locale),
                                          days: recovery.daysUntilExpiry,
                                      })}
                            </span>
                        </span>
                        <ChevronDown
                            size={15}
                            aria-hidden="true"
                            className={`shrink-0 text-text-3 transition-transform duration-200 ${
                                olderOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {olderOpen && (
                        <ul className="mt-2 flex flex-col gap-2">
                            <AnimatePresence initial={false}>
                                {recovery.openItems.map((item) => (
                                    <motion.div key={item.snapshotCheckId} {...rowMotion}>
                                        <OpenItemRow
                                            item={item}
                                            busy={pendingId === item.snapshotCheckId}
                                            onCheck={() => onResolve(item, "checked")}
                                            onSkip={() => onResolve(item, "skipped")}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * The two "nothing to do" states.
 *
 * Tinted only for the success case. A finished day earns the accent; a day nothing was
 * scheduled on gets the neutral surface, because tinting it would congratulate somebody for
 * a day that was never asked of them.
 */
function EmptyNote({
    icon,
    title,
    body,
    tone = "neutral",
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
    tone?: "neutral" | "success";
}) {
    const success = tone === "success";
    return (
        <div
            className={`mt-3 flex items-start gap-3 rounded-control border p-4 ${
                success ? "border-accent/20 bg-accent-soft" : "border-border bg-surface-2"
            }`}
            data-testid="briefing-yesterday-empty"
        >
            <span className={`mt-0.5 shrink-0 ${success ? "text-accent" : "text-text-3"}`}>
                {icon}
            </span>
            <span className="min-w-0">
                <span
                    className={`block text-sm font-semibold ${success ? "text-accent" : "text-text"}`}
                >
                    {title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-text-2">{body}</span>
            </span>
        </div>
    );
}
