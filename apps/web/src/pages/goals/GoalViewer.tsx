import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUp, CalendarDays, ChevronLeft, ChevronRight, GitBranch, Minus, Plus, Search, X } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import type { goal as GoalType } from "@beyou/types/goals/goalType";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import {
    childrenOf,
    formatGoalDeadline,
    orderGoalsForViewer,
    parseLocalDate,
    viewerIndexFor,
} from "@beyou/state";
import { enterGoals, updateGoal } from "@beyou/state/goal/goalsSlice";
import { setViewSort } from "@beyou/state/viewFilters/viewFiltersSlice";
import getGoals from "@beyou/api/goals/getGoals";
import increaseCurrentValue from "@beyou/api/goals/increaseCurrentValue";
import decreaseCurrentValue from "@beyou/api/goals/decreaseCurrentValue";
import markGoalAsComplete from "@beyou/api/goals/markGoalAsComplete";
import useAuthGuard from "../../components/useAuthGuard";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import useUiRefresh from "../../hooks/useUiRefresh";
import GoalProgressModal from "../../components/goals/GoalProgressModal";
import EmptyState from "../../components/EmptyState";
import Button from "../../components/Button";
import BeyouIcon from "../../ui/BeyouIcon";
import Chip, { type ChipVariant } from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import Ring from "../../ui/Ring";
import XpBar from "../../ui/XpBar";

/** The deck's orderings, in the order the select offers them. */
const SORT_OPTIONS: { value: string; key: string }[] = [
    { value: "status", key: "SortByStatus" },
    { value: "category", key: "SortByCategory" },
    { value: "end-asc", key: "SortByDeadline" },
    { value: "progress-desc", key: "SortByProgress" },
    { value: "name-asc", key: "SortByName" },
];

const STATUS_KEY: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
};
const TERM_KEY: Record<string, string> = {
    SHORT_TERM: "Short Term",
    MEDIUM_TERM: "Medium Term",
    LONG_TERM: "Long Term",
};

const CONTROL_CLASS =
    "h-9 min-w-0 rounded-control border border-border bg-surface px-2 text-xs text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

const toIsoDay = (value: Date | string | null | undefined): string => {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

/** Whole days from today to the goal's end, negative when the deadline has passed. */
const daysUntil = (endDate: Date | string): number | null => {
    const end = parseLocalDate(toIsoDay(endDate));
    if (!end) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / 86_400_000);
};

/**
 * Goals one at a time, full screen.
 *
 * The same idea as `/focus`: a `fixed inset-0` layer over the shell, inside the auth gate,
 * with a gesture (Escape, the X) as the only way out and no confirmation. The goals page
 * is a grid built for scanning; this one is for sitting with a single goal, its
 * motivation given the room the card never has, and moving to the next.
 *
 * The deck's ordering lives in `viewFilters.goalsViewer`, apart from the page's own sort:
 * listing by name and walking by status are different wishes and both survive a reload.
 */
export default function GoalViewer() {
    useAuthGuard();
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const goals = useSelector((state: RootState) => state.goals.goals) || [];
    const sortBy = useSelector((state: RootState) => state.viewFilters.goalsViewer) ?? "status";
    const [status, setStatus] = useState("all");
    const [categoryId, setCategoryId] = useState("all");
    const [progressOpen, setProgressOpen] = useState(false);
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});
    useUiRefresh(refreshUi);

    const loadGoals = useCallback(async () => {
        const response = await getGoals(t);
        if (Array.isArray(response.success)) dispatch(enterGoals(response.success));
    }, [dispatch, t]);

    // A deep link may land here before the goals page ever loaded the slice.
    useEffect(() => {
        if (goals.length === 0) void loadGoals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useAutoRefresh(loadGoals);

    const deck = useMemo(
        () => orderGoalsForViewer(goals, { sortBy, status, categoryId }),
        [goals, sortBy, status, categoryId],
    );

    // The URL is the position. `?goal=` names the slide, so the browser's own back button
    // works the way a person expects after tapping into a sub-goal: back is the main goal,
    // not the goals page. The arrows REPLACE the entry (walking the deck is one visit),
    // the jumps into a sub-goal or up to the parent PUSH one (that is a move worth
    // returning from). A filter that hides the named goal lands on the first slide.
    const requestedId = searchParams.get("goal");
    const current = viewerIndexFor(deck, requestedId);
    const goal: GoalType | undefined = deck[current];
    const next: GoalType | undefined = deck[current + 1];

    const categoryOptions = useMemo(() => {
        const seen = new Map<string, string>();
        goals.forEach((g) =>
            Object.entries(g.categories ?? {}).forEach(([id, c]) => {
                if (!seen.has(id)) seen.set(id, c.name);
            }),
        );
        return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
    }, [goals]);

    const leave = useCallback(() => navigate("/goals"), [navigate]);
    const goTo = useCallback(
        (target: number) => {
            const clamped = Math.min(Math.max(0, target), Math.max(0, deck.length - 1));
            const landing = deck[clamped];
            if (landing) setSearchParams({ goal: landing.id }, { replace: true });
        },
        [deck, setSearchParams],
    );
    const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);
    const goNext = useCallback(() => goTo(current + 1), [current, goTo]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            // The shared Modal listens on the window too; one Escape must not close the
            // progress dialog AND leave the viewer.
            if (document.querySelector('[role="dialog"]')) return;
            if (event.key === "Escape") leave();
            if (event.key === "ArrowRight") goNext();
            if (event.key === "ArrowLeft") goPrev();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [leave, goNext, goPrev]);

    const jumpTo = (goalId: string) => {
        if (deck.some((g) => g.id === goalId)) setSearchParams({ goal: goalId });
    };

    const applyProgress = async (amount: number, direction: "increase" | "decrease") => {
        if (!goal) return;
        const updated =
            direction === "increase"
                ? await increaseCurrentValue(goal.id, t, amount)
                : await decreaseCurrentValue(goal.id, t, amount);
        if (updated?.id) dispatch(updateGoal(updated));
        else await loadGoals();
    };

    const toggleComplete = async () => {
        if (!goal) return;
        const refresh = await markGoalAsComplete(goal.id, t);
        if (refresh?.success) setRefreshUi(refresh.success);
        await loadGoals();
    };

    const clearFilters = () => {
        setStatus("all");
        setCategoryId("all");
    };

    // --- the slide -------------------------------------------------------------------
    const isCompleted = goal?.status === "COMPLETED";
    const targetReached = Boolean(goal && goal.targetValue > 0 && goal.currentValue >= goal.targetValue);
    const percent = goal && goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : isCompleted ? 100 : 0;
    const statusVariant: ChipVariant = isCompleted ? "ok" : goal?.status === "IN_PROGRESS" ? "accent" : "neutral";
    const subGoals = goal ? childrenOf(goals, goal.id) : [];
    const parent = goal?.parentId ? goals.find((g) => g.id === goal.parentId) : undefined;
    const parentInDeck = parent ? deck.some((g) => g.id === parent.id) : false;
    const remaining = goal ? daysUntil(goal.endDate) : null;
    const deadlineLine = (() => {
        if (!goal) return "";
        if (isCompleted) {
            return t("CompletedOn", {
                date: formatGoalDeadline(goal.completeDate ?? goal.endDate, i18n.language),
            });
        }
        if (remaining === null) return "";
        if (remaining === 0) return t("DueToday");
        if (remaining < 0) return t("DaysOverdue", { count: -remaining });
        return t("DaysLeft", { count: remaining });
    })();
    const positionText = t("GoalViewerPosition", { index: deck.length ? current + 1 : 0, total: deck.length });

    return (
        <div
            className="fixed inset-0 z-[70] overflow-y-auto bg-bg"
            role="region"
            aria-label={t("GoalViewerTitle")}
            data-testid="goal-viewer"
        >
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 py-3 lg:px-6 lg:py-4">
                <header className="flex flex-wrap items-center gap-2 pb-3">
                    <IconButton label={t("GoalViewerLeave")} onClick={leave} data-testid="goal-viewer-leave">
                        <X size={18} aria-hidden="true" />
                    </IconButton>
                    <h1 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-3">
                        {t("GoalViewerTitle")}
                    </h1>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <select
                            aria-label={t("Sort by")}
                            value={sortBy}
                            onChange={(event) => dispatch(setViewSort({ view: "goalsViewer", sortBy: event.target.value }))}
                            className={CONTROL_CLASS}
                            data-testid="goal-viewer-sort"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{t(option.key)}</option>
                            ))}
                        </select>
                        <select
                            aria-label={t("Status")}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className={CONTROL_CLASS}
                            data-testid="goal-viewer-status"
                        >
                            <option value="all">{t("All")}</option>
                            <option value="NOT_STARTED">{t("Not Started")}</option>
                            <option value="IN_PROGRESS">{t("In Progress")}</option>
                            <option value="COMPLETED">{t("Completed")}</option>
                        </select>
                        {categoryOptions.length > 0 && (
                            <select
                                aria-label={t("Categories")}
                                value={categoryId}
                                onChange={(event) => setCategoryId(event.target.value)}
                                className={CONTROL_CLASS}
                                data-testid="goal-viewer-category"
                            >
                                <option value="all">{t("All")}</option>
                                {categoryOptions.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </header>

                {!goal ? (
                    <div className="flex flex-1 items-center justify-center">
                        <EmptyState
                            icon={<Search size={20} aria-hidden="true" />}
                            title={t("GoalViewerEmpty")}
                            actionLabel={status !== "all" || categoryId !== "all" ? t("ClearFilters") : undefined}
                            onAction={clearFilters}
                            variant="ghost"
                        />
                    </div>
                ) : (
                    <main
                        key={goal.id}
                        className="flex flex-1 flex-col items-center gap-5 py-4 text-center"
                        data-testid="goal-viewer-slide"
                        data-goal-id={goal.id}
                    >
                        {parent && (
                            <button
                                type="button"
                                onClick={() => jumpTo(parent.id)}
                                disabled={!parentInDeck}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] text-text-3 transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-default disabled:hover:bg-transparent"
                                data-testid="goal-viewer-parent"
                            >
                                <ArrowUp size={12} aria-hidden="true" />
                                {t("BackToParentGoal")}: <span className="font-medium text-text-2">{parent.name}</span>
                            </button>
                        )}

                        <IconTile size={72} tone={isCompleted ? "neutral" : "accent"}>
                            <BeyouIcon id={goal.iconId} size={36} />
                        </IconTile>

                        <div className="max-w-xl">
                            <h2 className={`text-2xl font-semibold tracking-[-0.01em] lg:text-3xl ${isCompleted ? "text-text-2" : "text-text"}`}>
                                {goal.name}
                            </h2>
                            {goal.motivation && (
                                <p className="mt-2 text-[15px] italic leading-relaxed text-text-2">{goal.motivation}</p>
                            )}
                            {goal.description && (
                                <p className="mt-2 text-[13px] leading-snug text-text-3">{goal.description}</p>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <Ring size={180} state={isCompleted ? "done" : "progress"} progress={percent / 100} label={`${percent}%`} />
                            <span className="font-mono text-sm text-text-2" data-testid="goal-viewer-counter">
                                {goal.currentValue}/{goal.targetValue} {goal.unit}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <Chip size="md" variant={statusVariant}>{t(STATUS_KEY[goal.status] ?? goal.status)}</Chip>
                            <Chip size="md" variant="time">{t(TERM_KEY[goal.term] ?? goal.term)}</Chip>
                            {Object.entries(goal.categories ?? {}).map(([id, c]) => (
                                <Chip key={id} size="md" icon={<BeyouIcon id={c.iconId} size={12} />}>{c.name}</Chip>
                            ))}
                            {(targetReached || isCompleted) && (
                                <Chip size="md" variant="xp" title={t("XP Reward")}>+{goal.xpReward} XP</Chip>
                            )}
                        </div>

                        <p className="flex items-center gap-1.5 font-mono text-[12px] text-text-3" data-testid="goal-viewer-deadline">
                            <CalendarDays size={13} aria-hidden="true" />
                            <span className={remaining !== null && remaining < 0 && !isCompleted ? "text-danger" : ""}>{deadlineLine}</span>
                            {!isCompleted && (
                                <span>· {t("Until")} {formatGoalDeadline(goal.endDate, i18n.language)}</span>
                            )}
                        </p>

                        {/* The same three moves as the card: minus, an exact amount, plus. Complete
                            appears once the target lands, because that is the click that pays. */}
                        <div className="flex items-center gap-2">
                            <IconButton
                                label={t("Decrease")}
                                onClick={() => applyProgress(1, "decrease")}
                                disabled={goal.currentValue === 0 || isCompleted}
                                className="h-10 w-10 border border-border"
                            >
                                <Minus size={18} aria-hidden="true" />
                            </IconButton>
                            <button
                                type="button"
                                onClick={() => setProgressOpen(true)}
                                disabled={isCompleted}
                                title={t("UpdateProgress")}
                                className="h-10 rounded-control border border-border px-4 font-mono text-sm text-text-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                            >
                                {t("UpdateProgress")}
                            </button>
                            {targetReached || isCompleted ? (
                                <Button
                                    text={isCompleted ? t("Undo") : t("Complete")}
                                    size="medium"
                                    mode={isCompleted ? "ghost" : "primary"}
                                    onClick={toggleComplete}
                                    testId="goal-viewer-complete"
                                />
                            ) : (
                                <IconButton
                                    label={t("Increase")}
                                    onClick={() => applyProgress(1, "increase")}
                                    className="h-10 w-10 border border-border"
                                    data-testid="goal-viewer-increase"
                                >
                                    <Plus size={18} aria-hidden="true" />
                                </IconButton>
                            )}
                        </div>

                        {subGoals.length > 0 && (
                            <section className="w-full max-w-xl text-left" data-testid="goal-viewer-subgoals">
                                <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-3">
                                    <GitBranch size={12} aria-hidden="true" />
                                    {t("SubGoals")}
                                </h3>
                                <ul className="flex flex-col gap-1 rounded-card border border-border bg-surface p-1.5">
                                    {subGoals.map((child) => {
                                        const inDeck = deck.some((g) => g.id === child.id);
                                        const done = child.status === "COMPLETED";
                                        return (
                                            <li key={child.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => jumpTo(child.id)}
                                                    disabled={!inDeck}
                                                    className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                                                    data-testid={`goal-viewer-subgoal-${child.id}`}
                                                >
                                                    <IconTile size={28} tone={done ? "neutral" : "accent"}>
                                                        <BeyouIcon id={child.iconId} size={15} />
                                                    </IconTile>
                                                    <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${done ? "text-text-3 line-through" : "text-text"}`}>
                                                        {child.name}
                                                    </span>
                                                    <XpBar className="w-20" current={child.currentValue} target={child.targetValue} compact />
                                                    <span className="shrink-0 font-mono text-[11px] text-text-3">
                                                        {child.currentValue}/{child.targetValue}
                                                    </span>
                                                    {inDeck && <ChevronRight size={14} aria-hidden="true" className="text-text-3" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}
                    </main>
                )}

                <footer className="flex items-center gap-3 pt-3">
                    <IconButton label={t("GoalViewerPrevious")} onClick={goPrev} disabled={current <= 0} data-testid="goal-viewer-prev" className="h-10 w-10 border border-border">
                        <ChevronLeft size={18} aria-hidden="true" />
                    </IconButton>
                    <div className="min-w-0 flex-1 text-center">
                        <span className="font-mono text-[12px] text-text-2" aria-live="polite" data-testid="goal-viewer-position">
                            {positionText}
                        </span>
                        {next && (
                            <p className="truncate text-[11.5px] text-text-3">
                                {t("GoalViewerUpNext")}: {next.name}
                            </p>
                        )}
                    </div>
                    <IconButton label={t("GoalViewerNext")} onClick={goNext} disabled={current >= deck.length - 1} data-testid="goal-viewer-next" className="h-10 w-10 border border-border">
                        <ChevronRight size={18} aria-hidden="true" />
                    </IconButton>
                </footer>
            </div>

            {goal && (
                <GoalProgressModal
                    isOpen={progressOpen}
                    onClose={() => setProgressOpen(false)}
                    name={goal.name}
                    currentValue={goal.currentValue}
                    targetValue={goal.targetValue}
                    unit={goal.unit}
                    onApply={applyProgress}
                />
            )}
        </div>
    );
}
