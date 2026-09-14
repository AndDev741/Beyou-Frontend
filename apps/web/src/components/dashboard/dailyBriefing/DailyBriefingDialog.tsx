import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { BriefingOpenItem, DailyBriefing } from "@beyou/types/briefing/briefing";
import Modal from "../../modals/Modal";
import Button from "../../Button";
import YesterdayPanel from "./YesterdayPanel";
import BriefingCarousel from "./BriefingCarousel";

type Props = {
    briefing: DailyBriefing;
    isOpen: boolean;
    onClose: () => void;
    onResolve: (item: BriefingOpenItem, outcome: "checked" | "skipped") => void;
    pendingId: string | null;
    locale: string;
};

const TITLE_ID = "daily-briefing-title";

/**
 * The first thing a user sees on a new day.
 *
 * Two halves, split on what they are for rather than on what they contain. The left is the
 * only part you can act on, so it sits first in the DOM and first in the stack on a phone;
 * the right is reading, and reading can wait. At `lg` they become columns with a divider,
 * and the divider is a hairline rather than a gap because the two halves are one thought.
 *
 * Rendered through the shared `Modal`, which already owns the focus trap, Escape, focus
 * restore and `aria-labelledby`. Hand-rolling a dialog here would mean re-earning all four.
 *
 * The width override is the only liberty taken with the Modal: its default `max-w-xl` is
 * sized for a confirmation, and two panels inside it would be two very narrow columns.
 */
export default function DailyBriefingDialog({
    briefing,
    isOpen,
    onClose,
    onResolve,
    pendingId,
    locale,
}: Props) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={TITLE_ID}
            className="max-w-3xl lg:max-w-4xl"
        >
            <div data-testid="daily-briefing">
                <header className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h2
                            id={TITLE_ID}
                            className="text-lg font-semibold tracking-[-0.01em] text-text"
                        >
                            {t("DailyBriefingTitle")}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("DailyBriefingClose")}
                        className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-control text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        data-testid="briefing-close"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                {/* Single column below lg, two from lg up. The action half leads in both, and
                    the hairline becomes vertical when the axis does. */}
                <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-0">
                    <div className="lg:pr-7">
                        <YesterdayPanel
                            briefing={briefing}
                            onResolve={onResolve}
                            pendingId={pendingId}
                            locale={locale}
                        />
                    </div>
                    <div className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                        <BriefingCarousel briefing={briefing} locale={locale} />
                    </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-border pt-4">
                    <Button
                        text={t("DailyBriefingDone")}
                        size="medium"
                        mode="primary"
                        onClick={onClose}
                        testId="briefing-done"
                    />
                </div>
            </div>
        </Modal>
    );
}
