import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { SecondBrainItemPattern, SecondBrainRoutine } from "@beyou/types/secondBrain/secondBrain";
import Ring from "../../ui/Ring";
import Block from "./Block";

type RoutineBlockProps = {
    /** Null when the routines source is off. */
    routine: SecondBrainRoutine | null;
};

/** How many names each list shows. The week's point is the pattern, and five make one. */
const LIST_MAX = 5;

function PatternList({
    title,
    tone,
    items,
    empty,
    testId,
}: {
    title: string;
    tone: "flame" | "success";
    items: SecondBrainItemPattern[];
    empty: string;
    testId: string;
}) {
    const { t } = useTranslation();
    return (
        <div data-testid={testId}>
            <h3 className={`text-[13px] font-semibold ${tone === "flame" ? "text-flame" : "text-success"}`}>
                {title}
            </h3>
            {items.length === 0 ? (
                <p className="mt-2 text-[13px] leading-snug text-text-2">{empty}</p>
            ) : (
                <ul className="mt-2 flex flex-col gap-2">
                    {items.slice(0, LIST_MAX).map((item) => (
                        <li key={item.name} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-sm text-text">{item.name}</span>
                            <span className="flex shrink-0 flex-col items-end">
                                <span className="font-mono text-xs text-text-2">
                                    {t("SecondBrainItemTimes", { checked: item.checked, asked: item.asked })}
                                </span>
                                {/* Skipped again and again reads differently from forgotten,
                                    so the count of skips is shown next to the item. */}
                                {item.skipped > 0 && (
                                    <span className="font-mono text-[11px] text-flame" data-testid="second-brain-item-skipped">
                                        {t("SecondBrainItemSkipped", { count: item.skipped })}
                                    </span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Whether the routines are being kept: the last seven days against the seven before, then the
 * items that slipped and the ones that held.
 *
 * The ring is the same piece as the check-in ring and the logo. The percentage leaves skipped
 * items out, since one skip is a choice. The two lists count them, because the same item
 * skipped again and again is a habit being dropped.
 */
export default function RoutineBlock({ routine }: RoutineBlockProps) {
    const { t } = useTranslation();

    if (!routine) {
        return (
            <Block title={t("SecondBrainRoutineTitle")} testId="second-brain-routine">
                <p className="text-sm text-text-2">{t("SecondBrainSourceOffBlock")}</p>
            </Block>
        );
    }

    const { thisWeekPercent, previousWeekPercent } = routine;
    const delta =
        thisWeekPercent != null && previousWeekPercent != null ? thisWeekPercent - previousWeekPercent : null;

    return (
        <Block title={t("SecondBrainRoutineTitle")} testId="second-brain-routine">
            {thisWeekPercent == null ? (
                <p className="max-w-[56ch] text-sm leading-relaxed text-text-2">{t("SecondBrainRoutineNoData")}</p>
            ) : (
                <>
                    <div className="flex items-center gap-4">
                        <Ring size={76} state="progress" progress={thisWeekPercent / 100} label={`${thisWeekPercent}%`} />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-text">{t("SecondBrainRoutineThisWeek")}</p>
                            {delta != null && (
                                <p
                                    className={`mt-1 inline-flex items-center gap-1 text-[13px] ${
                                        delta > 0 ? "text-success" : delta < 0 ? "text-flame" : "text-text-2"
                                    }`}
                                    data-testid="second-brain-routine-delta"
                                >
                                    {delta > 0 ? (
                                        <ArrowUpRight size={15} aria-hidden="true" />
                                    ) : delta < 0 ? (
                                        <ArrowDownRight size={15} aria-hidden="true" />
                                    ) : (
                                        <Minus size={15} aria-hidden="true" />
                                    )}
                                    {delta > 0
                                        ? t("SecondBrainRoutineUp", { points: delta })
                                        : delta < 0
                                          ? t("SecondBrainRoutineDown", { points: Math.abs(delta) })
                                          : t("SecondBrainRoutineSame")}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <PatternList
                            title={t("SecondBrainSlipping")}
                            tone="flame"
                            items={routine.slipping}
                            empty={t("SecondBrainNothingSlipping")}
                            testId="second-brain-slipping"
                        />
                        <PatternList
                            title={t("SecondBrainSteady")}
                            tone="success"
                            items={routine.steady}
                            empty={t("SecondBrainNothingSteady")}
                            testId="second-brain-steady"
                        />
                    </div>
                </>
            )}
        </Block>
    );
}
