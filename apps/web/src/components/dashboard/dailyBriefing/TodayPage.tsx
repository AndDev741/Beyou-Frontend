import { useTranslation } from "react-i18next";
import { Flame, Sunrise, Target } from "lucide-react";
import type { DailyBriefing } from "@beyou/types/briefing/briefing";
import BeyouIcon from "../../../ui/BeyouIcon";
import NarrativeLines from "./NarrativeLines";

type Props = { briefing: DailyBriefing; locale: string };

/** Whole numbers read as counts; 2.5 stays 2.5. */
function trim(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

/**
 * What the day holds, and anything with a clock on it.
 *
 * The streak line is careful about one thing: an unscheduled day cannot break a streak,
 * because the streak counts scheduled days. Saying "keep your streak alive" to somebody with
 * nothing on today would be the app not understanding its own rules, so that case gets its
 * own sentence instead.
 */
export default function TodayPage({ briefing, locale }: Props) {
    const { t } = useTranslation();
    const { today } = briefing;
    const atBest = today.currentStreak > 0 && today.currentStreak >= today.bestStreak;

    return (
        <div data-testid="briefing-today-page">
            <div className="flex items-center gap-2">
                <Sunrise size={15} className="shrink-0 text-text-3" aria-hidden="true" />
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-text">
                    {t("BriefingTodayHeading")}
                </h3>
            </div>

            <p className="mt-2 text-sm text-text-2">
                {today.scheduledToday
                    ? t("BriefingScheduledItems", { count: today.scheduledItemCount })
                    : t("BriefingNothingScheduled")}
            </p>

            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-text-2">
                <Flame
                    size={14}
                    className={`shrink-0 ${today.currentStreak > 0 ? "text-flame" : "text-text-3"}`}
                    aria-hidden="true"
                />
                {today.currentStreak === 0
                    ? t("BriefingNoStreak")
                    : atBest
                      ? t("BriefingStreakAtBest", { days: today.currentStreak })
                      : t("BriefingStreakStanding", {
                            days: today.currentStreak,
                            best: today.bestStreak,
                        })}
            </p>

            <NarrativeLines narrative={briefing.narrative} lines={briefing.narrative.todayLines} />

            {today.goalsApproaching.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <Target size={14} className="shrink-0 text-text-3" aria-hidden="true" />
                        <h4 className="text-xs font-semibold text-text-2">
                            {t("BriefingGoalsHeading")}
                        </h4>
                        <span className="h-px flex-1 bg-border" />
                    </div>

                    <ul className="mt-2.5 flex flex-col gap-2">
                        {today.goalsApproaching.map((goal) => {
                            const overdue = goal.daysRemaining < 0;
                            return (
                                <li
                                    key={goal.id}
                                    className="rounded-control border border-border bg-surface p-3"
                                    data-testid="briefing-goal"
                                >
                                    <div className="flex items-center gap-2">
                                        <BeyouIcon
                                            id={goal.iconId}
                                            size={15}
                                            className="shrink-0 text-text-2"
                                            showFallback
                                        />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                                            {goal.name}
                                        </span>
                                        <span
                                            className={`shrink-0 font-mono text-[11px] ${
                                                overdue ? "text-danger" : "text-text-3"
                                            }`}
                                        >
                                            {overdue
                                                ? t("BriefingGoalOverdue", {
                                                      count: Math.abs(goal.daysRemaining),
                                                  })
                                                : goal.daysRemaining === 0
                                                  ? t("BriefingGoalDueToday")
                                                  : t("BriefingGoalDaysLeft", {
                                                        count: goal.daysRemaining,
                                                    })}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                        {/* A track is warranted here: it is progress toward a
                                            stated target, and the remaining distance is the
                                            information the line carries. */}
                                        <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                                            <span
                                                className={`block h-full rounded-full ${
                                                    overdue ? "bg-danger" : "bg-accent"
                                                }`}
                                                style={{ width: `${goal.percentComplete}%` }}
                                            />
                                        </span>
                                        <span className="shrink-0 font-mono text-[11px] text-text-3">
                                            {t("BriefingGoalProgress", {
                                                current: trim(goal.currentValue, locale),
                                                target: trim(goal.targetValue, locale),
                                                unit: goal.unit,
                                            })}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
