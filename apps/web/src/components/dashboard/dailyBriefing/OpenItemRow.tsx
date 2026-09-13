import { useTranslation } from "react-i18next";
import { Check, SkipForward } from "lucide-react";
import type { BriefingOpenItem } from "@beyou/types/briefing/briefing";
import BeyouIcon from "../../../ui/BeyouIcon";

type Props = {
    item: BriefingOpenItem;
    onCheck: () => void;
    onSkip: () => void;
    /** True while this row's request is in flight. Both actions lock, not just the pressed one. */
    busy: boolean;
};

/**
 * One thing yesterday is still waiting on, and the two ways to answer it.
 *
 * The XP value is the reason this row is not just a name. A late check pays less than an
 * on-time one, and somebody who taps a forgotten habit and watches a smaller number land
 * with no explanation reads it as a bug rather than as the rule it is. So the row states
 * what the tap is worth before the tap, in the mono face the app already uses for counts.
 *
 * Check is the affirmative action and carries the accent; skip is quiet. Both are real
 * buttons with names, because the list is the one part of this dialog somebody might work
 * through entirely on a keyboard.
 */
export default function OpenItemRow({ item, onCheck, onSkip, busy }: Props) {
    const { t } = useTranslation();
    const worthNothing = item.xpIfCheckedNow < 1;

    return (
        <li
            className={`flex items-center gap-3 rounded-control border border-border bg-surface px-3 py-2.5 transition-opacity duration-200 ${
                busy ? "opacity-50" : ""
            }`}
            data-testid="briefing-open-item"
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-2 text-text-2">
                <BeyouIcon id={item.itemIconId} size={18} showFallback />
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{item.itemName}</span>
                <span className="mt-0.5 block truncate text-xs text-text-3">
                    {item.sectionName}
                    {/* The value rides in the secondary line rather than in its own column: at
                        phone width a third column pushes the name to two characters. */}
                    <span className="mx-1.5 text-border" aria-hidden="true">
                        |
                    </span>
                    <span className={worthNothing ? "" : "font-mono text-xp"}>
                        {worthNothing
                            ? t("BriefingWorthNothingNow")
                            : t("BriefingWorthNow", { xp: Math.round(item.xpIfCheckedNow) })}
                    </span>
                </span>
            </span>

            <span className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    onClick={onSkip}
                    disabled={busy}
                    aria-label={t("BriefingSkipItem", { name: item.itemName })}
                    className="flex size-9 items-center justify-center rounded-control text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.96] disabled:pointer-events-none"
                    data-testid="briefing-skip"
                >
                    <SkipForward size={16} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={onCheck}
                    disabled={busy}
                    aria-label={t("BriefingCheckItem", { name: item.itemName })}
                    className="flex size-9 items-center justify-center rounded-control bg-accent-soft text-accent transition-colors duration-200 hover:bg-accent hover:text-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.96] disabled:pointer-events-none"
                    data-testid="briefing-check"
                >
                    <Check size={17} aria-hidden="true" />
                </button>
            </span>
        </li>
    );
}
