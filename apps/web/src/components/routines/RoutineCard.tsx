import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiClock, FiEdit2, FiTrash2, FiChevronDown, FiCheckCircle, FiSlash } from "react-icons/fi";
import { Routine } from "@beyou/types/routine/routine";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { resolveIcon } from "@beyou/icons";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import Ring from "../../ui/Ring";
import { formatTimeRange, getSectionStats, getRoutineStats } from "@beyou/state";
import { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";
import { itemGroupToSkip } from "@beyou/types/routine/itemGroupToSkip";
import { parseLocalDate } from "@beyou/state";


type ItemLookup = Record<string, { name?: string; iconId?: string }>;

type RoutineCardProps = {
    routine: Routine;
    selectedDate: string;
    taskLookup: ItemLookup;
    habitLookup: ItemLookup;
    onEdit: (routine: Routine) => void;
    onSchedule: (routine: Routine) => void;
    onCheckItem: (payload: itemGroupToCheck) => Promise<void>;
    onSkipItem: (payload: itemGroupToSkip) => Promise<void>;
    onRequestDelete: (routine: Routine) => void;
};

export const RoutineCard = ({
    routine,
    selectedDate,
    taskLookup,
    habitLookup,
    onEdit,
    onSchedule,
    onCheckItem,
    onSkipItem,
    onRequestDelete,
}: RoutineCardProps) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    const stats = useMemo(() => getRoutineStats(routine, selectedDate), [routine, selectedDate]);
    const completion = stats.totalItems > 0 ? Math.round((stats.completedItems / stats.totalItems) * 100) : 0;
    const totalSections = routine.routineSections?.length || 0;
    const totalItems = routine.routineSections?.reduce((total, section) => {
        const tasks = section.taskGroup?.length || 0;
        const habits = section.habitGroup?.length || 0;
        return total + tasks + habits;
    }, 0) || 0;

    const scheduleDays = routine.schedule?.days || [];

    const handleDeleteClick = () => onRequestDelete(routine);

    // The backend stores "Monday", "Tuesday"…; the comparison is
    // case-insensitive because scheduling has written variants over time.
    const scheduledDays = new Set(scheduleDays.map((day) => day.toLowerCase()));
    const weekDays = [
        { key: "sunday", short: "D" },
        { key: "monday", short: "S" },
        { key: "tuesday", short: "T" },
        { key: "wednesday", short: "Q" },
        { key: "thursday", short: "Q" },
        { key: "friday", short: "S" },
        { key: "saturday", short: "S" },
    ];
    // Does the routine run on the open day? With no schedule, assume yes.
    const selectedWeekday = selectedDate
        ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
        : "";
    const runsOnSelectedDay = scheduledDays.size === 0 || scheduledDays.has(selectedWeekday);
    const isToday = selectedDate === new Date().toISOString().split("T")[0];

    const levelWindow = Math.max((routine.nextLevelXp ?? 0) - (routine.actualLevelXp ?? 0), 1);
    const levelProgress = Math.min(
        100,
        Math.max(0, Math.round((((routine.xp ?? 0) - (routine.actualLevelXp ?? 0)) / levelWindow) * 100)),
    );

    return (
        <Card className="group lg:px-5 lg:py-[18px]">
            <header className="flex flex-col gap-3 md:flex-row md:items-start">
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                    <span className="min-w-0 flex-1">
                        <b className="block truncate text-base font-semibold tracking-[-0.01em] text-text">
                            {routine.name}
                        </b>
                        <span className="text-xs text-text-3">
                        {t("SectionsCount", { count: totalSections })} · {t("ItemsCount", { count: totalItems })}
                        {scheduleDays.length > 0 &&
                            ` · ${
                                scheduleDays.length === 7
                                    ? t("EveryDay")
                                    : t("DaysPerWeek", { count: scheduleDays.length })
                            }`}
                        </span>
                    </span>
                    {/* On phones the actions hide until it opens; the chevron
                        avisa que o cartão expande. Vira 180° aberto. */}
                    <FiChevronDown
                        aria-hidden="true"
                        className={`shrink-0 text-text-3 transition-transform duration-200 md:hidden ${
                            expanded ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {/* On phones the card stays clean: the actions appear on opening
                    pelo título. No desktop continuam sempre à vista. */}
                <div
                    className={`${
                        expanded ? "flex" : "hidden"
                    } flex-wrap items-center gap-1.5 md:ml-auto md:flex md:flex-nowrap md:shrink-0`}
                >
                    <button
                        type="button"
                        data-tutorial-id="routine-schedule-button"
                        className="flex items-center gap-1.5 rounded-control bg-accent-soft px-3.5 py-[7px] text-[12.5px] font-semibold text-accent transition-colors duration-200 hover:bg-accent/15"
                        onClick={() => onSchedule(routine)}
                    >
                        <FiCalendar aria-hidden="true" />
                        {t("Schedule")}
                    </button>

                    {/* Edit and delete only on desktop hover — on phones
                        aparecem junto com o resto ao abrir o cartão. */}
                    <div className="flex items-center gap-1.5 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <button
                        type="button"
                        className="flex rounded-lg p-[7px] text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                        onClick={() => onEdit(routine)}
                        aria-label={t("Edit")}
                    >
                        <FiEdit2 />
                    </button>
                    <button
                        type="button"
                        className="flex rounded-lg p-[7px] text-text-3 transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                        onClick={handleDeleteClick}
                        aria-label={t("Delete")}
                    >
                        <FiTrash2 />
                    </button>
                    </div>

                    {/* Desktop only: on phones this row exists only with the
                        cartão aberto, e aí este chevron seria o SEGUNDO — o do
                        título já está ali em cima fazendo a mesma coisa. */}
                    <button
                        type="button"
                        className="hidden rounded-lg p-[7px] text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2 md:flex"
                        onClick={() => setExpanded((prev) => !prev)}
                        aria-label={expanded ? t("Collapse") : t("Expand")}
                        aria-expanded={expanded}
                    >
                        <FiChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                </div>
            </header>

            {/* The routine's identity in three blocks: when it runs, its level
                dela e como está hoje. Os quatro cartões de estatística que
                existiam aqui eram mais interface que informação. */}
            <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3 md:mt-4 md:gap-y-4">
                <div className="w-full md:w-auto">
                    <span className="mb-1.5 hidden text-[11px] font-semibold text-text-3 md:block">{t("Days")}</span>
                    <div className="flex gap-1">
                        {weekDays.map((day, index) => {
                            const isOn = scheduledDays.has(day.key);
                            return (
                                <i
                                    key={`${day.key}-${index}`}
                                    title={t(day.key)}
                                    className={`h-[26px] w-[26px] rounded-[8px] text-center font-mono text-[11px] font-semibold not-italic leading-[26px] md:h-[22px] md:w-[22px] md:rounded-[7px] md:text-[10px] md:leading-[22px] ${
                                        isOn ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-3"
                                    }`}
                                >
                                    {day.short}
                                </i>
                            );
                        })}
                    </div>
                </div>

                <div className="hidden md:block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-text-3">
                        {t("Level")} {routine.level ?? 0}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px] font-medium text-text-3">
                        <div className="h-1.5 w-[110px] overflow-hidden rounded-full bg-surface-2">
                            <div
                                className="h-full rounded-full bg-accent transition-[width] duration-500"
                                style={{ width: `${levelProgress}%` }}
                            />
                        </div>
                        {routine.xp ?? 0}/{routine.nextLevelXp ?? 0} XP
                    </div>
                </div>

                <div className="hidden md:block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-text-3">{t("Today")}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px] font-medium text-text-3">
                        <div className="h-1.5 w-[110px] overflow-hidden rounded-full bg-surface-2">
                            <div
                                className="h-full rounded-full bg-accent transition-[width] duration-500"
                                style={{ width: `${completion}%` }}
                            />
                        </div>
                        {stats.completedItems}/{stats.totalItems || totalItems}
                    </div>
                </div>

                {stats.xpEarned > 0 && (
                    <div className="hidden md:block">
                        <span className="mb-1.5 block text-[11px] font-semibold text-text-3">
                            {formatDate(selectedDate)}
                        </span>
                        <span className="rounded-full bg-xp-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-xp">
                            +{stats.xpEarned} XP
                        </span>
                    </div>
                )}
                {/* Phone: one bar only — the day's progress when the routine
                    roda nele, senão o nível. Duas barras iguais empilhadas em
                    tela estreita não diziam qual importava agora. */}
                <div className="w-full md:hidden">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                            className="h-full rounded-full bg-accent transition-[width] duration-500"
                            style={{ width: `${runsOnSelectedDay ? completion : levelProgress}%` }}
                        />
                    </div>
                    <span className="mt-1.5 block text-right font-mono text-[11px] font-medium text-text-3">
                        {runsOnSelectedDay
                            ? `${isToday ? t("Today").toLowerCase() : formatDate(selectedDate)} ${stats.completedItems}/${stats.totalItems || totalItems}`
                            : `LV ${routine.level ?? 0} · ${routine.xp ?? 0}/${routine.nextLevelXp ?? 0}`}
                    </span>
                </div>
            </div>

            {expanded && (
                <div className="mt-4 border-t border-border pt-2">
                        {routine.routineSections?.map((section) => (
                            <SectionRow
                                key={section.id}
                                section={section}
                                selectedDate={selectedDate}
                                taskLookup={taskLookup}
                                habitLookup={habitLookup}
                                routineId={routine.id}
                                onCheckItem={onCheckItem}
                                onSkipItem={onSkipItem}
                            />
                        ))}
                </div>
            )}
        </Card>
    );
};

const formatDate = (date: string) => parseLocalDate(date)?.toLocaleDateString() ?? "";

type SectionRowProps = {
    section: RoutineSection;
    selectedDate: string;
    taskLookup: ItemLookup;
    habitLookup: ItemLookup;
    routineId?: string;
    onCheckItem: (payload: itemGroupToCheck) => Promise<void>;
    onSkipItem: (payload: itemGroupToSkip) => Promise<void>;
};

const SectionRow = ({ section, selectedDate, taskLookup, habitLookup, routineId, onCheckItem, onSkipItem }: SectionRowProps) => {
    const { t } = useTranslation();
    const sectionStats = useMemo(() => getSectionStats(section, selectedDate), [section, selectedDate]);
    const hasIcon = resolveIcon(section.iconId).kind !== "fallback";

    const items = useMemo(() => {
        const tasks =
            section.taskGroup?.map((task) => {
                const data = taskLookup[task.taskId] || {};
                const check = task.taskGroupChecks?.find((c) => c?.checkDate === selectedDate);
                const completed = Boolean(check?.checked);
                const skipped = Boolean(check?.skipped);
                const xp = task.taskGroupChecks?.find(
                    (check) => check?.checkDate === selectedDate && typeof check?.xpGenerated === "number"
                )?.xpGenerated;

                return {
                    id: task.taskId,
                    groupId: task.id || task.taskId,
                    label: data.name || t("Task"),
                    iconId: data.iconId,
                    startTime: task.startTime,
                    endTime: task.endTime,
                    completed,
                    skipped,
                    xp,
                    type: "task" as const,
                };
            }) || [];

        const habits =
            section.habitGroup?.map((habit) => {
                const data = habitLookup[habit.habitId] || {};
                const check = habit.habitGroupChecks?.find((c) => c?.checkDate === selectedDate);
                const completed = Boolean(check?.checked);
                const skipped = Boolean(check?.skipped);
                const xp = habit.habitGroupChecks?.find(
                    (check) => check?.checkDate === selectedDate && typeof check?.xpGenerated === "number"
                )?.xpGenerated;

                return {
                    id: habit.habitId,
                    groupId: habit.id || habit.habitId,
                    label: data.name || t("Habit"),
                    iconId: data.iconId,
                    startTime: habit.startTime,
                    endTime: habit.endTime,
                    completed,
                    skipped,
                    xp,
                    type: "habit" as const,
                };
            }) || [];

        return [...tasks, ...habits].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }, [section, selectedDate, taskLookup, habitLookup, t]);

    return (
        <div className="mt-3 first:mt-0">
            {/* Same header as the day's routine: loose icon, 12.5px name in
                text-2 e a hora em mono. O tile de 32px com nome de 13,5px pesava
                mais que os itens que ele agrupa. */}
            <div className="flex items-center gap-2.5 py-1.5">
                <span className="shrink-0 text-[15px] text-text-3">
                    {hasIcon ? <BeyouIcon id={section.iconId} /> : <FiClock />}
                </span>
                <b className="truncate text-[12.5px] font-semibold text-text-2">{section.name}</b>
                <span className="whitespace-nowrap font-mono text-[11px] text-text-3">
                    {formatTimeRange(section.startTime, section.endTime)} · {sectionStats.completedItems}/
                    {sectionStats.totalItems}
                </span>
                {sectionStats.xpEarned > 0 && (
                    <span className="ml-1 shrink-0 rounded-full bg-xp-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-xp">
                        +{sectionStats.xpEarned} XP
                    </span>
                )}
            </div>

            {items.length > 0 && (
                <div className="mt-1.5">
                    {items.map((item, idx) => {
                        const hasItemIcon = item.iconId ? resolveIcon(item.iconId).kind !== "fallback" : false;
                        const handleToggle = () => {
                            if (!routineId) return;
                            const payload: itemGroupToCheck = {
                                routineId,
                                localDate: selectedDate,
                                ...(item.type === "task"
                                    ? {
                                        taskGroupDTO: {
                                            taskGroupId: item.groupId,
                                            startTime: item.startTime,
                                        },
                                    }
                                    : {
                                        habitGroupDTO: {
                                            habitGroupId: item.groupId,
                                            startTime: item.startTime,
                                        },
                                    }),
                            };
                            onCheckItem(payload);
                        };
                        const handleSkip = () => {
                            if (!routineId) return;
                            const payload: itemGroupToSkip = {
                                routineId,
                                localDate: selectedDate,
                                skip: !item.skipped,
                                ...(item.type === "task"
                                    ? {
                                        taskGroupDTO: {
                                            taskGroupId: item.groupId,
                                            startTime: item.startTime,
                                        },
                                    }
                                    : {
                                        habitGroupDTO: {
                                            habitGroupId: item.groupId,
                                            startTime: item.startTime,
                                        },
                                    }),
                            };
                            onSkipItem(payload);
                        };
                        return (
                            <div
                                key={`${item.type}-${item.id}-${idx}`}
                                className="group flex items-center gap-2.5 rounded-control px-1.5 py-1.5 transition-colors duration-200 hover:bg-surface-2"
                            >
                                {/* Same pattern as the day's routine: the input is
                                    real (teclado, leitor de tela, e2e) e o anel é
                                    o desenho por cima dele. */}
                                <label className="-my-2 -ml-2 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                                    <input
                                        type="checkbox"
                                        aria-label={item.label}
                                        className="peer sr-only"
                                        checked={item.completed}
                                        onChange={handleToggle}
                                    />
                                    <Ring
                                        size={26}
                                        state={item.completed ? "done" : item.skipped ? "skipped" : "todo"}
                                        className="rounded-full transition-transform duration-200 group-hover:scale-105 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface"
                                    />
                                </label>

                                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                                    {hasItemIcon ? <BeyouIcon id={item.iconId} /> : <FiCheckCircle />}
                                </span>

                                {/* On phones the row breaks in two: metadata on
                                    cima, nome embaixo em largura cheia — igual à
                                    rotina do dia e ao nativo. `flex-col-reverse`
                                    inverte só o VISUAL; no DOM o nome vem antes,
                                    que é o que leitor de tela e e2e leem. */}
                                <div className="flex min-w-0 flex-1 flex-col-reverse gap-1 lg:flex-row lg:items-center lg:gap-3">
                                    <span
                                        className={`line-clamp-2 text-[13.5px] font-medium lg:line-clamp-1 ${
                                            item.completed || item.skipped ? "text-text-3" : "text-text"
                                        } ${item.skipped ? "line-through" : ""}`}
                                    >
                                        {item.label}
                                    </span>

                                    <div className="flex shrink-0 items-center gap-1.5 lg:ml-auto lg:gap-2">
                                        {item.xp ? (
                                            <span className="rounded-full bg-xp-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-xp">
                                                +{item.xp} XP
                                            </span>
                                        ) : null}
                                        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-medium text-text-3">
                                            {formatTimeRange(item.startTime, item.endTime)}
                                        </span>
                                        {!item.completed && (
                                            <button
                                                type="button"
                                                aria-label={item.skipped ? t("Undo skip") : t("Skip")}
                                                title={item.skipped ? t("Undo skip") : t("Skip")}
                                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                                                onClick={handleSkip}
                                            >
                                                <FiSlash size={13} aria-hidden="true" />
                                                {item.skipped ? t("Undo skip") : t("Skip")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
