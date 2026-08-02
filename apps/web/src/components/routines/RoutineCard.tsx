import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiClock, FiEdit2, FiTrash2, FiChevronDown, FiCheckCircle } from "react-icons/fi";
import { Routine } from "@beyou/types/routine/routine";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { resolveIcon } from "@beyou/icons";
import BeyouIcon from "../../ui/BeyouIcon";
import {
    formatTimeRange,
    getSectionStats,
    getRoutineStats,
    getTimeOfDay,
} from "./routineMetrics";
import { AiFillStar } from "react-icons/ai";
import { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";


type ItemLookup = Record<string, { name?: string; iconId?: string }>;

type RoutineCardProps = {
    routine: Routine;
    selectedDate: string;
    taskLookup: ItemLookup;
    habitLookup: ItemLookup;
    onEdit: (routine: Routine) => void;
    onSchedule: (routine: Routine) => void;
    onCheckItem: (payload: itemGroupToCheck) => Promise<void>;
    onRequestDelete: (routineId: string) => void;
    onConfirmDelete: (routineId: string) => void;
    onCancelDelete: () => void;
    isConfirmingDelete: boolean;
};

const timeOfDayClasses: Record<string, string> = {
    morning: "bg-accent/10 text-accent",
    afternoon: "bg-success/10 text-success",
    evening: "bg-surface-2/10 text-text",
    night: "bg-description/20 text-text",
};

export const RoutineCard = ({
    routine,
    selectedDate,
    taskLookup,
    habitLookup,
    onEdit,
    onSchedule,
    onCheckItem,
    onRequestDelete,
    onConfirmDelete,
    onCancelDelete,
    isConfirmingDelete,
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

    const handleDeleteClick = () => {
        if (routine.id) {
            onRequestDelete(routine.id);
        }
    };

    const confirmDelete = () => {
        if (routine.id) {
            onConfirmDelete(routine.id);
        }
    };

    const weekDays = [
        { key: "SUNDAY", short: "D" },
        { key: "MONDAY", short: "S" },
        { key: "TUESDAY", short: "T" },
        { key: "WEDNESDAY", short: "Q" },
        { key: "THURSDAY", short: "Q" },
        { key: "FRIDAY", short: "S" },
        { key: "SATURDAY", short: "S" },
    ];
    const levelWindow = Math.max((routine.nextLevelXp ?? 0) - (routine.actualLevelXp ?? 0), 1);
    const levelProgress = Math.min(
        100,
        Math.max(0, Math.round((((routine.xp ?? 0) - (routine.actualLevelXp ?? 0)) / levelWindow) * 100)),
    );

    return (
        <div className="rounded-card border border-border bg-surface p-4 lg:px-5 lg:py-[18px]">
            <header className="flex items-start gap-3">
                <div className="min-w-0">
                    <b className="block truncate text-base font-semibold tracking-[-0.01em] text-text">
                        {routine.name}
                    </b>
                    <span className="text-xs text-text-3">
                        {t("SectionsCount", { count: totalSections })} · {t("ItemsCount", { count: totalItems })}
                        {scheduleDays.length === 7 && ` · ${t("EveryDay")}`}
                    </span>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        data-tutorial-id="routine-schedule-button"
                        className="flex items-center gap-1.5 rounded-control bg-accent-soft px-3.5 py-[7px] text-[12.5px] font-semibold text-accent transition-colors duration-200 hover:bg-accent/15"
                        onClick={() => onSchedule(routine)}
                    >
                        <FiCalendar aria-hidden="true" />
                        {t("Schedule")}
                    </button>
                    <button
                        type="button"
                        className="flex rounded-lg p-[7px] text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                        onClick={() => onEdit(routine)}
                        aria-label={t("Edit")}
                    >
                        <FiEdit2 />
                    </button>
                    {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 rounded-control border border-danger/30 bg-danger/5 px-2 py-1">
                            <span className="text-xs font-semibold text-danger">{t("Confirm Deletion")}</span>
                            <button
                                type="button"
                                className="rounded-lg bg-danger px-2 py-0.5 text-xs font-semibold text-on-accent"
                                onClick={confirmDelete}
                            >
                                {t("Yes")}
                            </button>
                            <button
                                type="button"
                                className="rounded-lg px-2 py-0.5 text-xs font-semibold text-text-2"
                                onClick={onCancelDelete}
                            >
                                {t("No")}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="flex rounded-lg p-[7px] text-text-3 transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                            onClick={handleDeleteClick}
                            aria-label={t("Delete")}
                        >
                            <FiTrash2 />
                        </button>
                    )}
                    <button
                        type="button"
                        className="flex rounded-lg p-[7px] text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                        onClick={() => setExpanded((prev) => !prev)}
                        aria-label={expanded ? t("Collapse") : t("Expand")}
                        aria-expanded={expanded}
                    >
                        <FiChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                </div>
            </header>

            {/* A identidade da rotina em três blocos: quando ela roda, o nível
                dela e como está hoje. Os quatro cartões de estatística que
                existiam aqui eram mais interface que informação. */}
            <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-4">
                <div>
                    <span className="mb-1.5 block text-[11px] font-semibold text-text-3">{t("Days")}</span>
                    <div className="flex gap-1">
                        {weekDays.map((day, index) => {
                            const isOn = scheduleDays.includes(day.key);
                            return (
                                <i
                                    key={`${day.key}-${index}`}
                                    title={t(day.key)}
                                    className={`h-[22px] w-[22px] rounded-[7px] text-center font-mono text-[10px] font-semibold not-italic leading-[22px] ${
                                        isOn ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-3"
                                    }`}
                                >
                                    {day.short}
                                </i>
                            );
                        })}
                    </div>
                </div>

                <div>
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

                <div>
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
                    <div>
                        <span className="mb-1.5 block text-[11px] font-semibold text-text-3">
                            {formatDate(selectedDate)}
                        </span>
                        <span className="rounded-full bg-xp-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-xp">
                            +{stats.xpEarned} XP
                        </span>
                    </div>
                )}
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
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
};

type SectionRowProps = {
    section: RoutineSection;
    selectedDate: string;
    taskLookup: ItemLookup;
    habitLookup: ItemLookup;
    routineId?: string;
    onCheckItem: (payload: itemGroupToCheck) => Promise<void>;
};

const SectionRow = ({ section, selectedDate, taskLookup, habitLookup, routineId, onCheckItem }: SectionRowProps) => {
    const { t } = useTranslation();
    const sectionStats = useMemo(() => getSectionStats(section, selectedDate), [section, selectedDate]);
    const hasIcon = resolveIcon(section.iconId).kind !== "fallback";
    const timeOfDay = getTimeOfDay(section.startTime);

    const items = useMemo(() => {
        const tasks =
            section.taskGroup?.map((task) => {
                const data = taskLookup[task.taskId] || {};
                const completed = task.taskGroupChecks?.some(
                    (check) => check?.checkDate === selectedDate && Boolean(check?.checked)
                );
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
                    xp,
                    type: "task" as const,
                };
            }) || [];

        const habits =
            section.habitGroup?.map((habit) => {
                const data = habitLookup[habit.habitId] || {};
                const completed = habit.habitGroupChecks?.some(
                    (check) => check?.checkDate === selectedDate && Boolean(check?.checked)
                );
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
                    xp,
                    type: "habit" as const,
                };
            }) || [];

        return [...tasks, ...habits].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }, [section, selectedDate, taskLookup, habitLookup, t]);

    return (
        <div className="rounded-control border border-border bg-surface/80 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-control ${timeOfDayClasses[timeOfDay]} text-base`}
                    >
                        {hasIcon ? <BeyouIcon id={section.iconId} /> : <FiClock />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-text">{section.name}</p>
                            {section.favorite && <AiFillStar className="text-accent" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-text-2">
                            <span className="flex items-center gap-1">
                                <FiClock /> {formatTimeRange(section.startTime, section.endTime)}
                            </span>
                            <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                                {t(timeOfDay)}
                            </span>
                            <span className="text-xs font-medium text-text">
                                {sectionStats.completedItems}/{sectionStats.totalItems} {t("Done")}
                            </span>
                            {sectionStats.xpEarned > 0 && (
                                <span className="text-xs font-medium text-success">+{sectionStats.xpEarned} XP</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {items.length > 0 && (
                <div className="mt-3 space-y-2">
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
                        return (
                            <div
                                key={`${item.type}-${item.id}-${idx}`}
                                className={`flex items-center gap-3 rounded-control border px-3 py-2 text-sm transition-colors ${item.completed
                                    ? "border-success/30 bg-success/10 text-text"
                                    : "border-border bg-surface text-text"
                                    }`}
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                                    {hasItemIcon ? <BeyouIcon id={item.iconId} /> : <FiCheckCircle />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.label}</p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-2">
                                        <span className="flex items-center gap-1">
                                            <FiClock /> {formatTimeRange(item.startTime, item.endTime)}
                                        </span>
                                        <span className="rounded-full bg-ligthGray/40 px-2 py-0.5 font-semibold text-text/80">
                                            {item.type === "task" ? t("Task") : t("Habit")}
                                        </span>
                                        {item.completed && <span className="text-success font-semibold">{t("Completed")}</span>}
                                        {item.xp ? <span className="text-accent font-semibold">+{item.xp} XP</span> : null}
                                    </div>

                                </div>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 accent-primary cursor-pointer"
                                    checked={item.completed}
                                    onChange={handleToggle}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
