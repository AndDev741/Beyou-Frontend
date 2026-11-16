import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { goalPaceMessage, showsExpectedPace, type GoalPaceTone } from "@beyou/state";
import type { BriefingGoal } from "@beyou/types/briefing/briefing";
import BeyouIcon from "../../ui/BeyouIcon";
import IconTile from "../../ui/IconTile";
import Block from "./Block";

type GoalsBlockProps = {
    goals: BriefingGoal[];
    /** False when the goals source is off, which is a different empty state from "no goals". */
    enabled: boolean;
};

const PACE_TONE: Record<GoalPaceTone, string> = {
    success: "text-success",
    danger: "text-danger",
    flame: "text-flame",
    muted: "text-text-2",
};

/**
 * The goals closest to their end date, with the pace verdict the daily briefing gives.
 *
 * It reuses the briefing's sentences on purpose. The same goal read as "behind" in the morning
 * and "on pace" here would be worse than showing neither.
 */
export default function GoalsBlock({ goals, enabled }: GoalsBlockProps) {
    const { t, i18n } = useTranslation();
    const formatNumber = (value: number) =>
        new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(value);

    const daysLabel = (goal: BriefingGoal) => {
        if (goal.daysRemaining < 0) return t("BriefingGoalOverdue", { count: Math.abs(goal.daysRemaining) });
        if (goal.daysRemaining === 0) return t("BriefingGoalDueToday");
        return t("BriefingGoalDaysLeft", { count: goal.daysRemaining });
    };

    return (
        <Block
            title={t("SecondBrainGoalsTitle")}
            testId="second-brain-goals"
            action={
                <Link
                    to="/goals"
                    className="inline-flex items-center gap-1 rounded-control text-[13px] font-semibold text-accent transition-colors duration-200 hover:text-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    {t("SecondBrainGoalsCta")}
                    <ArrowRight size={14} aria-hidden="true" />
                </Link>
            }
        >
            {!enabled ? (
                <p className="text-sm text-text-2">{t("SecondBrainSourceOffBlock")}</p>
            ) : goals.length === 0 ? (
                <p className="text-sm text-text-2">{t("SecondBrainGoalsEmpty")}</p>
            ) : (
                <ul className="flex flex-col gap-5">
                    {goals.map((goal) => {
                        const pace = goalPaceMessage(goal, formatNumber);
                        const percent = Math.min(100, Math.max(0, goal.percentComplete));
                        return (
                            <li key={goal.id} className="flex gap-3" data-testid="second-brain-goal">
                                <IconTile size={36}>
                                    <BeyouIcon id={goal.iconId} size={18} showFallback />
                                </IconTile>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className="truncate text-sm font-semibold text-text">{goal.name}</p>
                                        <span className="shrink-0 font-mono text-xs text-text-2">{daysLabel(goal)}</span>
                                    </div>
                                    {/* The tick marks where a steady pace would be by today, so the
                                        gap between it and the fill is the thing the eye reads. */}
                                    <div className="relative mt-2 h-1.5 w-full rounded-full bg-surface-2">
                                        <div
                                            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                                            style={{ width: `${percent}%` }}
                                        />
                                        {showsExpectedPace(goal) && (
                                            <span
                                                aria-hidden="true"
                                                title={t("BriefingGoalExpected", { percent: goal.expectedPercent })}
                                                className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-text-2"
                                                style={{ left: `${Math.min(100, Math.max(0, goal.expectedPercent))}%` }}
                                            />
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                        <span className="font-mono text-xs text-text-2">
                                            {t("BriefingGoalProgress", {
                                                current: formatNumber(goal.currentValue),
                                                target: formatNumber(goal.targetValue),
                                                unit: goal.unit,
                                            })}
                                        </span>
                                        {pace && (
                                            <span className={`text-[13px] ${PACE_TONE[pace.tone]}`}>
                                                {t(pace.key, pace.params)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Block>
    );
}
