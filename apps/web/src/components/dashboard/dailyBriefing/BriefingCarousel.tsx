import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRIEFING_AUTO_ADVANCE_MS, BRIEFING_PAGES, type BriefingPage } from "@beyou/state";
import type { DailyBriefing } from "@beyou/types/briefing/briefing";
import TodayPage from "./TodayPage";
import RecapPage from "./RecapPage";

type Props = {
    briefing: DailyBriefing;
    locale: string;
};

const PAGE_LABEL: Record<BriefingPage, string> = {
    today: "BriefingPageToday",
    yesterday: "BriefingPageYesterday",
};

/**
 * The informational half: what is coming, then how yesterday went.
 *
 * It turns itself over once, after thirty seconds, and then never again. Content that keeps
 * moving under a reader is both irritating and a WCAG 2.2.2 problem, so the rules here are
 * strict: one advance, cancelled by any interaction with the control, and not armed at all
 * under `prefers-reduced-motion`. Someone who has touched the bullets has told us they are
 * driving, and the timer does not argue.
 *
 * The active bullet fills over the countdown rather than sitting inert. That is the honest
 * version of an auto-advance: the page is about to change and the control says so before it
 * happens, instead of surprising somebody mid-sentence.
 */
export default function BriefingCarousel({ briefing, locale }: Props) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const [page, setPage] = useState<BriefingPage>("today");
    // Once true, nothing auto-advances again for the life of the dialog.
    const [userDriving, setUserDriving] = useState(false);
    const timer = useRef<number | null>(null);

    const armed = !reduceMotion && !userDriving && page === "today";

    const select = useCallback((next: BriefingPage) => {
        setUserDriving(true);
        setPage(next);
    }, []);

    useEffect(() => {
        if (!armed) return;
        timer.current = window.setTimeout(() => setPage("yesterday"), BRIEFING_AUTO_ADVANCE_MS);
        return () => {
            if (timer.current !== null) window.clearTimeout(timer.current);
        };
    }, [armed]);

    return (
        <div className="flex min-w-0 flex-col" data-testid="briefing-carousel">
            <div className="relative flex-1">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={page}
                        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {page === "today" ? (
                            <TodayPage briefing={briefing} locale={locale} />
                        ) : (
                            <RecapPage briefing={briefing} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-2" role="tablist" aria-label={t("DailyBriefingTitle")}>
                {BRIEFING_PAGES.map((key) => {
                    const active = key === page;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-label={t(PAGE_LABEL[key])}
                            onClick={() => select(key)}
                            className="group flex items-center py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            data-testid={`briefing-bullet-${key}`}
                        >
                            <span
                                className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                                    active
                                        ? "w-7 bg-accent/25"
                                        : "w-1.5 bg-border group-hover:bg-text-3"
                                }`}
                            >
                                {active && (
                                    <span
                                        className={`absolute inset-y-0 left-0 block w-full origin-left rounded-full bg-accent ${
                                            armed ? "animate-briefing-countdown" : ""
                                        }`}
                                        style={
                                            armed
                                                ? { animationDuration: `${BRIEFING_AUTO_ADVANCE_MS}ms` }
                                                : undefined
                                        }
                                    />
                                )}
                            </span>
                        </button>
                    );
                })}
                <span className="ml-1 text-xs font-medium text-text-3">{t(PAGE_LABEL[page])}</span>
            </div>
        </div>
    );
}
