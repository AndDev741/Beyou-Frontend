import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Layers, Minus, Plus, Target, X } from "lucide-react";
import {
    createStudyCycle, getStudyCycle, getStudyCycles, planStudyCycle, updateStudyCycle,
} from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import {
    enterStudyCycle, formatStudyMinutes, orderedDays, subjectLabel, subjectOptions, topicWeight, WEEKDAYS, weekMinutes,
    type SubjectOption,
} from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type {
    BlockMode, CycleConfigRequest, CycleDay, CycleTopic, PlanResponse, StudyCycle,
} from "@beyou/types/notebook/studyCycle";
import ErrorNotice from "../../components/ErrorNotice";
import NotebookIcon from "../../components/notebook/NotebookIcon";
import { useRefreshStudyCycles } from "../../components/notebook/cycles/useStudyToday";
import { sentenceCase, weekdayNames } from "../../components/notebook/cycles/cycleFormat";
import { indent, useNotebookTrees } from "../../components/notebook/cycles/useSubjectPages";
import { RootPrefix } from "../../components/notebook/cycles/BlockParts";

/** How long the editor waits after the last change before asking for a new plan. */
const PLAN_DEBOUNCE_MS = 300;
const MAX_BLOCK_OPTIONS = [60, 90, 120];
const DAY_STEP = 30;
const DAY_MAX = 720;
const MAX_TOPICS = 30;

/** A new cycle's week until the person changes it: weekdays, a longer Saturday, Sunday off. */
const DEFAULT_DAYS: CycleDay[] = WEEKDAYS.map((weekday) => ({
    weekday,
    minutes: weekday === "SUNDAY" ? 0 : weekday === "SATURDAY" ? 120 : 90,
    startTime: null,
}));

/** A subject of the cycle being edited. `rootTitle` is null for a root topic. */
type TopicRow = CycleTopic & { title: string; icon: string | null; rootTitle: string | null };

/** A typed minute count inside what the server takes. While the field is mid-edit ("1" on the way
 * to "120") the plan is asked with the clamped value, never with a number it would refuse. */
const clampMinutes = (value: number | null): number | null =>
    value === null || Number.isNaN(value) ? null : Math.max(5, Math.min(600, Math.round(value)));

const configTopic = ({ topicId, importance, mastery, minutesOverride }: TopicRow): CycleTopic =>
    ({ topicId, importance, mastery, minutesOverride: clampMinutes(minutesOverride) });

/**
 * Builds or changes a cycle: the week, the topics with how much each matters and how well it is
 * known, and the order of blocks that comes out.
 *
 * The arithmetic is the server's (`POST /notebook/cycles/plan`), asked again ~300 ms after the
 * last change, so the preview here and the blocks a save produces can never disagree. A slower
 * answer to an older question is dropped when it lands after a newer one.
 */
export default function StudyCycleEditor() {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const refresh = useRefreshStudyCycles();
    const { cycleId } = useParams();
    const editing = Boolean(cycleId);
    const existing = useSelector((state: RootState) => (cycleId ? state.studyCycles.byId[cycleId] : undefined));
    const { roots, trees } = useNotebookTrees();

    const [ready, setReady] = useState(!editing);
    const [name, setName] = useState("");
    const [days, setDays] = useState<CycleDay[]>(DEFAULT_DAYS);
    const [defaultMode, setDefaultMode] = useState<BlockMode>("GOAL");
    const [maxBlock, setMaxBlock] = useState(90);
    const [topics, setTopics] = useState<TopicRow[]>([]);
    const [plan, setPlan] = useState<PlanResponse | null>(null);
    const [planFailed, setPlanFailed] = useState(false);
    const [taken, setTaken] = useState<Record<string, string>>({});
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [saving, setSaving] = useState(false);
    const initialized = useRef(false);
    const latestPlan = useRef(0);

    useEffect(() => {
        if (!cycleId) return;
        void getStudyCycle(cycleId, t).then((response) => {
            if (response.success) dispatch(enterStudyCycle(response.success));
            else setError(response.error ?? {});
        });
    }, [cycleId, t, dispatch]);

    // The form starts from the saved cycle once, and then belongs to the person editing it.
    useEffect(() => {
        if (!existing || initialized.current) return;
        initialized.current = true;
        setName(existing.name);
        setDays(orderedDays(existing.days));
        setDefaultMode(existing.defaultMode);
        setMaxBlock(existing.maxBlockMinutes);
        setTopics(existing.topics.map((topic) => ({
            topicId: topic.topicId, importance: topic.importance, mastery: topic.mastery,
            minutesOverride: topic.minutesOverride, title: topic.topic.title, icon: topic.topic.icon,
            rootTitle: topic.topic.rootTitle ?? null,
        })));
        setReady(true);
    }, [existing]);

    // Subjects another active cycle holds. The server refuses them and every page above or below
    // them (STUDY_CYCLE_TOPIC_TAKEN); saying so in the picker saves the round trip. Read into this
    // screen only, so opening the editor does not make every later refresh re-read every cycle.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const listed = await getStudyCycles(t);
            if (cancelled || !listed.success) return;
            const others = listed.success.filter((summary) => summary.id !== cycleId);
            const cycles = await Promise.all(others.map((summary) => getStudyCycle(summary.id, t)));
            if (cancelled) return;
            const holders: Record<string, string> = {};
            cycles.forEach((cycle) => cycle.success?.topics.forEach((topic) => {
                holders[topic.topicId] = cycle.success!.name;
            }));
            setTaken(holders);
        })();
        return () => {
            cancelled = true;
        };
    }, [cycleId, t]);

    const planRequest = useMemo(
        () => ({ days, maxBlockMinutes: maxBlock, topics: topics.map(configTopic) }),
        [days, maxBlock, topics]
    );

    useEffect(() => {
        const ask = ++latestPlan.current;
        if (planRequest.topics.length === 0) {
            setPlan(null);
            setPlanFailed(false);
            return;
        }
        const timer = window.setTimeout(() => {
            void planStudyCycle(planRequest, t).then((response) => {
                if (ask !== latestPlan.current) return;
                setPlanFailed(!response.success);
                if (response.success) setPlan(response.success);
            });
        }, PLAN_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [planRequest, t]);

    const planOf = (topicId: string) => plan?.topics.find((topic) => topic.topicId === topicId);
    const titleOf = (topicId: string) => topics.find((topic) => topic.topicId === topicId)?.title ?? "";

    /** Whether a topic's blocks aim at concepts: its saved blocks say, else the cycle's default. */
    const modeOf = (topicId: string, occurrence: number): BlockMode => {
        const saved = existing?.blocks.filter((block) => block.topic.id === topicId) ?? [];
        return saved[occurrence]?.mode ?? defaultMode;
    };

    const setTopic = (topicId: string, patch: Partial<TopicRow>) =>
        setTopics((rows) => rows.map((row) => (row.topicId === topicId ? { ...row, ...patch } : row)));
    const setDay = (index: number, patch: Partial<CycleDay>) =>
        setDays((list) => list.map((day, i) => (i === index ? { ...day, ...patch } : day)));

    // Every root topic and the pages under it, each with the reason it cannot join (already here,
    // overlapping a subject picked here, or overlapping one another cycle holds).
    const options = useMemo(
        () => subjectOptions({ roots, trees, picked: topics.map((row) => row.topicId), taken }),
        [roots, trees, topics, taken]
    );
    const optionOf = (topicId: string) => options.find((option) => option.id === topicId);
    // An older server sends no rootTitle; the loaded trees can still say it.
    const rootOf = (row: TopicRow) => row.rootTitle ?? optionOf(row.topicId)?.rootTitle ?? null;
    const labelOf = (row: TopicRow) => subjectLabel({ title: row.title, rootTitle: rootOf(row) });
    const labelOfId = (topicId: string) => {
        const row = topics.find((candidate) => candidate.topicId === topicId);
        return row ? labelOf(row) : "";
    };

    const addTopic = (topicId: string) => {
        const option = optionOf(topicId);
        if (!option || option.disabledReason !== null || topics.length >= MAX_TOPICS) return;
        setTopics((rows) => [...rows, {
            topicId, importance: 3, mastery: 3, minutesOverride: null, title: option.title, icon: option.icon, rootTitle: option.rootTitle,
        }]);
    };

    /** The option's line: indented by depth, with why it is closed when it is. */
    const optionText = (option: SubjectOption): string => {
        const reason = option.disabledReason;
        const text = reason === null
            ? option.title
            : reason === "picked"
              ? t("StudyCycleSubjectPickedOption", { subject: option.title })
              : reason === "overlapsPicked"
                ? t("StudyCycleSubjectOverlapOption", { subject: option.title })
                : taken[option.id]
                  ? t("StudyCycleTopicTakenOption", { topic: option.title, cycle: reason.takenBy })
                  : t("StudyCycleSubjectNearTakenOption", { subject: option.title, cycle: reason.takenBy });
        return `${indent(option.depth)}${text}`;
    };

    const trimmed = name.trim();
    const canSave = ready && trimmed.length > 0 && trimmed.length <= 80 && topics.length > 0 && !saving;

    const save = async () => {
        if (!canSave) return;
        const request: CycleConfigRequest = { name: trimmed, defaultMode, maxBlockMinutes: maxBlock, days, topics: topics.map(configTopic) };
        setSaving(true);
        setError(null);
        const response = cycleId ? await updateStudyCycle(cycleId, request, t) : await createStudyCycle(request, t);
        setSaving(false);
        if (!response.success) {
            setError(response.error ?? {});
            return;
        }
        const saved: StudyCycle = response.success;
        dispatch(enterStudyCycle(saved));
        void refresh();
        navigate(`/notebook/cycles?cycle=${saved.id}`);
    };

    const names = weekdayNames(i18n.language);
    const week = weekMinutes(days);
    const totalWeight = topics.reduce((sum, row) => sum + topicWeight(row.importance, row.mastery), 0);
    const occurrences = new Map<string, number>();
    const backTo = cycleId ? `/notebook/cycles?cycle=${cycleId}` : "/notebook/cycles";

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7" data-testid="study-cycle-editor">
            <Link to={backTo} className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-text-2 hover:text-text">
                <ChevronLeft size={15} aria-hidden="true" />{t("StudyCyclesTitle")}
            </Link>
            <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
                <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex min-w-[260px] flex-1 flex-col gap-2">
                        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">
                            {editing ? t("StudyCycleEditTitle") : t("StudyCycleNewTitle")}
                        </h1>
                        <label className="flex max-w-md flex-col gap-1.5 text-[13px] font-semibold text-text">
                            {t("StudyCycleName")}
                            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid="cycle-name"
                                placeholder={t("StudyCycleNamePlaceholder")}
                                className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <Link to={backTo} className="inline-flex h-10 items-center rounded-control px-4 text-sm font-semibold text-text-2 hover:bg-surface-2">
                            {t("Cancel")}
                        </Link>
                        <button type="submit" disabled={!canSave} data-testid="cycle-save"
                            className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60">
                            {t("StudyCycleSave")}
                        </button>
                    </div>
                </header>
                <ErrorNotice error={error} className="mb-4" />

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <main className="flex min-w-0 flex-col gap-4">
                        <section aria-labelledby="topics-title" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5" data-testid="cycle-topics">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 id="topics-title" className="text-base font-semibold text-text">{t("StudyCycleTopicsTitle")}</h2>
                                <span className="text-[13px] text-text-2">{t("StudyCycleWeekToSplit", { minutes: formatStudyMinutes(week) })}</span>
                            </div>

                            {topics.map((row) => {
                                const label = labelOf(row);
                                const root = rootOf(row);
                                const planned = planOf(row.topicId);
                                const weight = topicWeight(row.importance, row.mastery);
                                // The server's formula (contract 2.6), here so it moves with the stepper.
                                const share = totalWeight > 0 ? weight / totalWeight : 0;
                                const minutes = row.minutesOverride ?? planned?.minutes ?? null;
                                const goal = modeOf(row.topicId, 0) === "GOAL";
                                return (
                                    <div key={row.topicId} data-testid="cycle-topic-row" className="flex flex-col gap-2.5 border-t border-border pt-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-text">
                                                <NotebookIcon icon={row.icon} size={16} fallback={<Layers size={16} className="text-text-3" aria-hidden="true" />} />
                                                <span className="min-w-0 break-words" data-testid="cycle-topic-label">
                                                    <RootPrefix root={root} />{row.title}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-[13px] text-text-2" data-testid="topic-weight">
                                                {t("StudyCycleWeightShare", { weight, share: Math.round(share * 100) })}
                                            </span>
                                            <span className="shrink-0 text-[13px] text-text-2">
                                                {planned ? t("StudyCycleBlockCount", { count: planned.blocks }) : "–"}
                                            </span>
                                            <button type="button" onClick={() => setTopics((rows) => rows.filter((r) => r.topicId !== row.topicId))}
                                                aria-label={t("StudyCycleRemoveTopic", { topic: label })}
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-danger">
                                                <X size={15} aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                                            <Stepper value={row.importance} label={t("StudyCycleColImportance")}
                                                downLabel={t("StudyCycleImportanceDown", { topic: label })} upLabel={t("StudyCycleImportanceUp", { topic: label })}
                                                onChange={(value) => setTopic(row.topicId, { importance: value })} testId="topic-importance" />
                                            <Stepper value={row.mastery} label={t("StudyCycleColMastery")}
                                                downLabel={t("StudyCycleMasteryDown", { topic: label })} upLabel={t("StudyCycleMasteryUp", { topic: label })}
                                                onChange={(value) => setTopic(row.topicId, { mastery: value })} testId="topic-mastery" />
                                            {/* A div, not a label: the reset button below may not sit inside one. */}
                                            <div className="flex flex-col gap-1 text-xs font-semibold text-text-2">
                                                <span aria-hidden="true">{t("StudyCycleColMinutes")}</span>
                                                <input type="number" inputMode="numeric" min={5} max={600} step={5}
                                                    value={minutes ?? ""} placeholder={planned ? String(planned.suggestedMinutes) : ""}
                                                    aria-label={t("StudyCycleTopicMinutesLabel", { topic: label })} data-testid="topic-minutes"
                                                    onChange={(e) => setTopic(row.topicId, {
                                                        minutesOverride: e.target.value === "" ? null : Math.round(Number(e.target.value)),
                                                    })}
                                                    onBlur={() => setTopic(row.topicId, { minutesOverride: clampMinutes(row.minutesOverride) })}
                                                    className={`h-8 w-24 rounded-control border bg-surface px-2.5 font-mono text-sm font-normal text-text outline-none focus:border-accent ${
                                                        row.minutesOverride !== null ? "border-accent" : "border-border"
                                                    }`} />
                                                {goal && <span className="text-[11px] font-normal text-text-3">{t("StudyCycleEstimateHint")}</span>}
                                                {row.minutesOverride !== null && planned && (
                                                    <button type="button" onClick={() => setTopic(row.topicId, { minutesOverride: null })} data-testid="topic-minutes-reset"
                                                        className="w-fit text-left text-[11px] font-semibold text-accent hover:underline">
                                                        {t("StudyCycleBackToSuggestion", { minutes: planned.suggestedMinutes })}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {topics.length === 0 && (
                                <p className="rounded-control border border-dashed border-border px-3 py-4 text-center text-[13px] text-text-2">
                                    {t("StudyCycleNoTopics")}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                                <p className="max-w-xl text-xs text-text-2">{t("StudyCycleWeightExplain")}</p>
                                {topics.length < MAX_TOPICS && (
                                    <select value="" onChange={(e) => e.target.value && addTopic(e.target.value)} data-testid="cycle-add-topic"
                                        aria-label={t("StudyCycleAddTopic")}
                                        className="h-10 max-w-[280px] rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text outline-none focus:border-accent">
                                        <option value="">{t("StudyCycleAddTopic")}</option>
                                        {/* One flat list, each root followed by its pages indented: a root stays
                                            selectable by its plain title. A nested option's accessible name carries
                                            its root, which the indent only shows to sighted readers. */}
                                        {options.map((option) => (
                                            <option key={option.id} value={option.id} disabled={option.disabledReason !== null}
                                                aria-label={option.rootTitle ? `${option.rootTitle} › ${optionText(option).trim()}` : undefined}>
                                                {optionText(option)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <p className="text-xs text-text-3">{t("StudyCycleSubjectHint")}</p>
                            {editing && <p className="text-xs text-text-3">{t("StudyCycleEditMergeNote")}</p>}
                        </section>

                        <section aria-labelledby="order-title" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5" data-testid="cycle-plan">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 id="order-title" className="text-base font-semibold text-text">{t("StudyCycleOrderTitle")}</h2>
                                {plan && (
                                    <span className="text-[13px] text-text-2">
                                        {t("StudyCycleOrderCount", { count: plan.blocks.length, total: formatStudyMinutes(plan.plannedMinutes) })}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-2">{t("StudyCycleOrderExplain")}</p>
                            {planFailed && <p className="text-[13px] text-text-2">{t("StudyCyclePlanFailed")}</p>}
                            {plan && plan.blocks.length > 0 ? (
                                <ol className="flex flex-wrap gap-1.5" aria-label={t("StudyCycleOrderTitle")}>
                                    {plan.blocks.map((block) => {
                                        const occurrence = occurrences.get(block.topicId) ?? 0;
                                        occurrences.set(block.topicId, occurrence + 1);
                                        const goal = modeOf(block.topicId, occurrence) === "GOAL";
                                        return (
                                            <li key={block.position} data-testid="cycle-plan-block"
                                                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-[13px] text-text">
                                                <span className="font-mono text-[11px] text-text-3">{block.position}</span>
                                                <span className="max-w-[160px] truncate font-semibold" title={labelOfId(block.topicId)}>{titleOf(block.topicId)}</span>
                                                {goal && <Target size={13} className="text-accent" aria-label={t("StudyCycleModeGoal")} />}
                                                <span className="font-mono text-[11px] text-text-2">{block.plannedMinutes}′</span>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : (
                                !planFailed && <p className="text-[13px] text-text-3">{t("StudyCycleOrderEmpty")}</p>
                            )}
                        </section>
                    </main>

                    <aside className="flex flex-col gap-4">
                        <section aria-labelledby="week-edit-title" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4" data-testid="cycle-week-edit">
                            <div className="mb-1 flex items-baseline justify-between">
                                <h2 id="week-edit-title" className="text-sm font-semibold text-text">{t("StudyCycleWeek")}</h2>
                                <span className="font-mono text-xs font-semibold text-text-2">{formatStudyMinutes(week)}</span>
                            </div>
                            {days.map((day, index) => (
                                <div key={day.weekday} className="flex items-center gap-2" data-testid="cycle-day">
                                    <span className="w-10 text-[13px] font-semibold text-text">{sentenceCase(names[day.weekday])}</span>
                                    <span className="flex items-center gap-1">
                                        <button type="button" onClick={() => setDay(index, { minutes: Math.max(0, day.minutes - DAY_STEP) })}
                                            disabled={day.minutes === 0} aria-label={t("StudyCycleDayLess", { day: names[day.weekday] })}
                                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 disabled:opacity-40">
                                            <Minus size={13} aria-hidden="true" />
                                        </button>
                                        <span className="w-[62px] text-center text-[13px] font-semibold text-text" data-testid="cycle-day-minutes">
                                            {day.minutes === 0 ? t("StudyCycleRestDay") : formatStudyMinutes(day.minutes)}
                                        </span>
                                        <button type="button" onClick={() => setDay(index, { minutes: Math.min(DAY_MAX, day.minutes + DAY_STEP) })}
                                            disabled={day.minutes >= DAY_MAX} aria-label={t("StudyCycleDayMore", { day: names[day.weekday] })}
                                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 disabled:opacity-40">
                                            <Plus size={13} aria-hidden="true" />
                                        </button>
                                    </span>
                                    <input type="time" value={day.startTime ?? ""} disabled={day.minutes === 0}
                                        onChange={(e) => setDay(index, { startTime: e.target.value || null })}
                                        aria-label={t("StudyCycleDayStart", { day: names[day.weekday] })}
                                        className="ml-auto h-8 w-[112px] rounded-control border border-border bg-surface px-2 text-[13px] text-text outline-none focus:border-accent disabled:opacity-40" />
                                </div>
                            ))}
                            <p className="mt-1 text-xs text-text-2">{t("StudyCycleStartTimeHint")}</p>
                        </section>

                        <section aria-labelledby="mode-title" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                            <h2 id="mode-title" className="text-sm font-semibold text-text">{t("StudyCycleDefaultMode")}</h2>
                            <Choice value={defaultMode} onChange={setDefaultMode} testId="cycle-default-mode" label={t("StudyCycleDefaultMode")}
                                options={[{ value: "TIME", label: t("StudyCycleModeTime") }, { value: "GOAL", label: t("StudyCycleModeGoal") }]} />
                            <p className="text-xs text-text-2">{t(defaultMode === "GOAL" ? "StudyCycleDefaultModeGoalHint" : "StudyCycleDefaultModeTimeHint")}</p>
                        </section>

                        <section aria-labelledby="max-title" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                            <h2 id="max-title" className="text-sm font-semibold text-text">{t("StudyCycleMaxBlock")}</h2>
                            <Choice value={String(maxBlock)} onChange={(value) => setMaxBlock(Number(value))} testId="cycle-max-block" label={t("StudyCycleMaxBlock")}
                                options={[...new Set([...MAX_BLOCK_OPTIONS, maxBlock])].sort((a, b) => a - b)
                                    .map((value) => ({ value: String(value), label: `${value} min` }))} />
                            <p className="text-xs text-text-2">{t("StudyCycleMaxBlockHint")}</p>
                        </section>

                        <section aria-labelledby="lap-sum-title" className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4" data-testid="cycle-lap-summary">
                            <h2 id="lap-sum-title" className="text-sm font-semibold text-text">{t("StudyCycleOneLap")}</h2>
                            <span className="text-xl font-semibold tracking-[-0.01em] text-text">
                                {plan ? formatStudyMinutes(plan.plannedMinutes) : "–"}
                            </span>
                            {plan && (
                                <span className="text-[13px] text-text-2">
                                    {plan.lapDays !== null ? t("StudyCycleLapDays", { count: Math.max(1, plan.lapDays) }) : t("StudyCycleLapNoWeek")}
                                </span>
                            )}
                        </section>
                    </aside>
                </div>
            </form>
        </div>
    );
}

/** A 1..5 stepper with its name above it, the scale importance and mastery share. */
function Stepper({ value, label, downLabel, upLabel, onChange, testId }: {
    value: number;
    label: string;
    downLabel: string;
    upLabel: string;
    onChange: (value: number) => void;
    testId: string;
}) {
    return (
        <div className="flex flex-col gap-1" data-testid={testId}>
            <span className="text-xs font-semibold text-text-2">{label}</span>
            <span className="flex items-center gap-1">
                <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label={downLabel}
                    data-testid={`${testId}-down`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 disabled:opacity-40">
                    <Minus size={13} aria-hidden="true" />
                </button>
                <span className="w-6 text-center font-mono text-sm font-semibold text-text" aria-live="polite">{value}</span>
                <button type="button" onClick={() => onChange(Math.min(5, value + 1))} disabled={value >= 5} aria-label={upLabel}
                    data-testid={`${testId}-up`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 disabled:opacity-40">
                    <Plus size={13} aria-hidden="true" />
                </button>
            </span>
        </div>
    );
}

function Choice<T extends string>({ value, options, onChange, testId, label }: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    testId: string;
    label: string;
}) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-1.5" data-testid={testId}>
            {options.map((option) => (
                <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}
                    data-testid={`${testId}-${option.value}`}
                    className={`h-9 rounded-control border px-3.5 text-[13px] font-semibold ${
                        value === option.value ? "border-text bg-text text-surface" : "border-border bg-surface text-text hover:bg-surface-2"
                    }`}>
                    {option.label}
                </button>
            ))}
        </div>
    );
}
