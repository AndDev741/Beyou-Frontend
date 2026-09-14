import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRIEFING_PAGES, type BriefingPage } from "@beyou/state";
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
 * The informational half: what is coming, and how yesterday went.
 *
 * **Nothing moves this on its own.** An earlier version turned itself over after thirty
 * seconds, and that was wrong for a reason specific to this panel: the prose arrives from an
 * LLM whenever it arrives, so the reader most likely to be mid-sentence when the timer fires
 * is exactly the one who just got something worth reading. A page that changes under somebody
 * is also a WCAG 2.2.2 problem, but the product reason came first.
 *
 * Which makes the tabs the only way through, so they are labelled rather than dots. Dots were
 * defensible while the panel advanced itself and the user only needed to know where they
 * were; now they need to know they can go somewhere, and two words say that and a pair of
 * circles does not.
 */
export default function BriefingCarousel({ briefing, locale }: Props) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const [page, setPage] = useState<BriefingPage>("today");

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

            <div
                className="mt-4 flex items-center gap-1 border-t border-border pt-3"
                role="tablist"
                aria-label={t("DailyBriefingTitle")}
            >
                {BRIEFING_PAGES.map((key) => {
                    const active = key === page;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setPage(key)}
                            className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                                active
                                    ? "bg-accent-soft text-accent"
                                    : "text-text-3 hover:bg-surface-2 hover:text-text-2"
                            }`}
                            data-testid={`briefing-bullet-${key}`}
                        >
                            {t(PAGE_LABEL[key])}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
