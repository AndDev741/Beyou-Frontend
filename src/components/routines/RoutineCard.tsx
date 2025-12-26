import { ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiClock, FiEdit2, FiTrash2, FiChevronDown, FiCheckCircle, FiLayers } from "react-icons/fi";
import { Routine } from "../../types/routine/routine";
import { RoutineSection } from "../../types/routine/routineSection";
import iconSearch from "../icons/iconsSearch";
import {
    formatTime,
    formatTimeRange,
    getSectionStats,
    getRoutineStats,
    getTimeOfDay,
} from "./routineMetrics";
import { AiFillStar } from "react-icons/ai";
import { itemGroupToCheck } from "../../types/routine/itemGroupToCheck";

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
    morning: "bg-primary/10 text-primary",
    afternoon: "bg-success/10 text-success",
    evening: "bg-secondary/10 text-secondary",
    night: "bg-description/20 text-secondary",
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

    return (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background shadow-sm transition-transform duration-200 hover:translate-y-[-1px] hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-primary" />
            <div className="p-4 space-y-4">
                <header className="flex items-start justify-between gap-4">
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="p-1 rounded-md border border-primary/20 text-secondary hover:border-primary/40 transition-transform duration-150 hover:-translate-y-0.5"
                                    onClick={() => setExpanded((prev) => !prev)}
                                    aria-label={expanded ? t("Collapse") : t("Expand")}
                                >
                                    <FiChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                                <span className="text-lg font-semibold text-secondary">
                                    {routine.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    className="rounded-md border border-primary/20 px-3 py-2 text-sm font-medium text-secondary hover:bg-primary/10 transition-transform duration-150 hover:-translate-y-0.5"
                                    onClick={() => onSchedule(routine)}
                                >
                                    <FiCalendar className="inline mr-2" />
                                    {t("Schedule")}
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-primary/20 p-2 text-secondary hover:bg-primary/10 transition-transform duration-150 hover:-translate-y-0.5"
                                    onClick={() => onEdit(routine)}
                                    aria-label={t("Edit")}
                                >
                                    <FiEdit2 />
                                </button>
                                {isConfirmingDelete ? (
                                    <div className="flex flex-col md:flex-row items-center gap-2 rounded-md border border-error/30 bg-error/5 px-2 py-1">
                                        <span className="text-sm font-semibold text-error">{t("Confirm Deletion")}</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="rounded-md bg-error px-2 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-error/90 hover:-translate-y-0.5"
                                                onClick={confirmDelete}
                                            >
                                                {t("Yes")}
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded-md border border-primary/40 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 hover:-translate-y-0.5"
                                                onClick={onCancelDelete}
                                            >
                                                {t("No")}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="rounded-md border border-error/30 p-2 text-error hover:bg-error/10 transition-transform duration-150 hover:-translate-y-0.5"
                                        onClick={handleDeleteClick}
                                        aria-label={t("Delete")}
                                    >
                                        <FiTrash2 />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full">
                            <Badge
                            key={1}>
                                <FiLayers className="mr-1" /> {totalSections} {t("Sections")}
                            </Badge>
                            <Badge
                            key={2}>
                                <FiCheckCircle className="mr-1" /> {stats.completedItems}/{stats.totalItems || totalItems} {t("Done")}
                            </Badge>
                            <Badge
                            key={3}>
                                <FiClock className="mr-1" /> {completion}% {t("Progress")}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap text-xs text-description w-full pl-1">
                            {scheduleDays.length > 0 ? (
                                scheduleDays.map((day) => (
                                    <span
                                        key={day}
                                        className="rounded-full bg-primary/10 pr-3 py-1 font-medium text-primary"
                                    >
                                        {t(day)}
                                    </span>
                                ))
                            ) : (
                                <span className="text-description">{t("No schedule set")}</span>
                            )}
                        </div>
                    </div>
                </header>

                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ligthGray/40">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${completion}%` }}
                            />
                        </div>
                        <span className="text-sm font-semibold text-secondary w-14 text-right">{completion}%</span>
                    </div>
                    {stats.xpEarned > 0 && (
                        <p className="text-xs text-success font-medium">
                            +{stats.xpEarned} XP {t("earned on")} {formatDate(selectedDate)}
                        </p>
                    )}
                </div>

                {expanded && (
                    <div className="space-y-3">
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
    const Icon = iconSearch(section.iconId || "")?.IconComponent;
    const timeOfDay = getTimeOfDay(section.startTime);

    const items = useMemo(() => {
        const tasks =
            section.taskGroup?.map((task) => {
                const data = taskLookup[task.taskId] || {};
                console.log("TASK DATA FOUND => ", data)
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
                    completed,
                    xp,
                    type: "task" as const,
                };
            }) || [];

        const habits =
            section.habitGroup?.map((habit) => {
                const data = habitLookup[habit.habitId] || {};
                console.log("HABIT DATA FOUND => ", data)
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
                    completed,
                    xp,
                    type: "habit" as const,
                };
            }) || [];
        console.log("SECTION => ", section, "HABITS => ", habits)

        return [...tasks, ...habits].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }, [section, selectedDate, taskLookup, habitLookup, t]);

    return (
        <div className="rounded-lg border border-primary/15 bg-background/80 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${timeOfDayClasses[timeOfDay]} text-base`}
                    >
                        {Icon ? <Icon /> : <FiClock />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-secondary">{section.name}</p>
                            {section.favorite && <AiFillStar className="text-primary" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-description">
                            <span className="flex items-center gap-1">
                                <FiClock /> {formatTimeRange(section.startTime, section.endTime)}
                            </span>
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                {t(timeOfDay)}
                            </span>
                            <span className="text-xs font-medium text-secondary">
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
                    {items.map((item) => {
                        const ItemIcon = item.iconId ? iconSearch(item.iconId)?.IconComponent : null;
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
                                key={item.id}
                                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${item.completed
                                    ? "border-success/30 bg-success/10 text-secondary"
                                    : "border-primary/10 bg-background text-secondary"
                                    }`}
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    {ItemIcon ? <ItemIcon /> : <FiCheckCircle />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.label}</p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-description">
                                        <span className="flex items-center gap-1">
                                            <FiClock /> {formatTime(item.startTime)}
                                        </span>
                                        <span className="rounded-full bg-ligthGray/40 px-2 py-0.5 font-semibold text-secondary/80">
                                            {item.type === "task" ? t("Task") : t("Habit")}
                                        </span>
                                        {item.completed && <span className="text-success font-semibold">{t("Completed")}</span>}
                                        {item.xp ? <span className="text-primary font-semibold">+{item.xp} XP</span> : null}
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

type BadgeProps = {
    children: ReactNode;
};

const Badge = ({ children }: BadgeProps) => (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-secondary">
        {children}
    </span>
);
