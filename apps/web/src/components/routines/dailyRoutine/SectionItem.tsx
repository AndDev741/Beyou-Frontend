import BeyouIcon from "../../../ui/BeyouIcon";
import { resolveIcon } from "@beyou/icons";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import type { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { FiEdit2, FiTrash2, FiX, FiClock, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import TaskAndHabitSelector from "./taskSelector/TaskAndHabitSelector";
import GhostAdd from "../../../ui/GhostAdd";
import { useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import { formatTime, formatTimeRange } from "@beyou/state";
import { getItemTimeErrorKeys, isOvernightRange, ITEM_TIME_TOLERANCE_MINUTES } from "@beyou/validation/routineValidation";

interface SectionItemProps {
    section: RoutineSection;
    onEdit: () => void;
    onDelete: () => void;
    setRoutineSection?: React.Dispatch<React.SetStateAction<RoutineSection[]>>;
    index: number;
    /** How many sections the list holds, so the arrows know which end they are at. */
    count: number;
    /** Moves this section one place up (-1) or down (1). */
    onMove: (dir: -1 | 1) => void;
    /** react-beautiful-dnd drag handle, applied to the grip. */
    dragHandleProps?: DraggableProvidedDragHandleProps;
}

/** Section header time chip (mono, inset). */
const TimeChip = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded-[7px] border border-border bg-surface-2 px-2 py-1 font-mono text-[11.5px] font-medium text-text-2">
        {children}
    </span>
);

const SectionItem = ({ section, onEdit, onDelete, setRoutineSection, index, count, onMove, dragHandleProps }: SectionItemProps) => {
    const { t } = useTranslation();
    const hasIcon = resolveIcon(section.iconId).kind !== "fallback";
    const [openTaskSelector, setOpenTaskSelector] = useState(false);
    const itemCount = (section.taskGroup?.length ?? 0) + (section.habitGroup?.length ?? 0);
    // An empty section starts open: it was just created and the next step is
    // putting a habit or task inside it.
    const [open, setOpen] = useState(itemCount === 0);
    const isOvernight = isOvernightRange(section.startTime, section.endTime);

    const toMinutes = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    };

    const fromMinutes = (minutes: number) => {
        const total = (minutes + 1440) % 1440;
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    const addMinutes = (time: string, delta: number) => fromMinutes(toMinutes(time) + delta);

    const minStart = !isOvernight && section.startTime ? addMinutes(section.startTime, -ITEM_TIME_TOLERANCE_MINUTES) : undefined;
    const maxEnd = !isOvernight && section.endTime ? addMinutes(section.endTime, ITEM_TIME_TOLERANCE_MINUTES) : undefined;

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    const getMergedItems = () => {
        const tasks = (section.taskGroup ?? []).map((item, idx) => ({
            type: 'task' as const,
            id: item.taskId,
            startTime: item?.startTime,
            endTime: item?.endTime,
            originalIndex: idx,
        }));

        const habits = (section.habitGroup ?? []).map((item, idx) => ({
            type: 'habit' as const,
            id: item.habitId,
            startTime: item?.startTime,
            endTime: item?.endTime,
            originalIndex: idx,
        }));

        return [...tasks, ...habits].sort((a, b) =>
            a?.startTime ? a.startTime.localeCompare(b.startTime) : 0 - (b?.startTime ? b.startTime.localeCompare(a.startTime) : 0)
        );
    };

    const mergedItems = getMergedItems();

    const [editingItem, setEditingItem] = useState<{
        type: 'task' | 'habit';
        index: number;
        startTime: string;
        endTime?: string;
    } | null>(null);

    // Starts editing an item
    const handleStartEditItem = (
        itemType: 'task' | 'habit',
        itemIndex: number,
        currentStartTime: string,
        currentEndTime?: string
    ) => {
        setEditingItem({
            type: itemType,
            index: itemIndex,
            startTime: currentStartTime,
            endTime: currentEndTime
        });
    };

    // Saves the edit of an item
    const handleSaveEditItem = (newStartTime: string, newEndTime?: string) => {
        if (!setRoutineSection || !editingItem) return;

        setRoutineSection(prev =>
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                if (editingItem.type === 'task') {
                    const newTaskGroup = sectionItem.taskGroup?.map((task, i) =>
                        i === editingItem.index ? { ...task, startTime: newStartTime, endTime: newEndTime } : task
                    ) || [];
                    return { ...sectionItem, taskGroup: newTaskGroup };
                } else {
                    const newHabitGroup = sectionItem.habitGroup?.map((habit, i) =>
                        i === editingItem.index ? { ...habit, startTime: newStartTime, endTime: newEndTime } : habit
                    ) || [];
                    return { ...sectionItem, habitGroup: newHabitGroup };
                }
            })
        );

        setEditingItem(null);
    };

    // Cancels the edit
    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleFavorite = () => {
        if (!setRoutineSection) return;

        setRoutineSection(prev => 
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                return {...sectionItem, favorite: !sectionItem?.favorite}
            })
        )
    };

    // Deletes an item
    const handleDeleteItem = (itemType: 'task' | 'habit', itemIndex: number) => {
        if (!setRoutineSection) return;

        setRoutineSection(prev =>
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                if (itemType === 'task') {
                    const newTaskGroup = sectionItem.taskGroup?.filter((_, i) => i !== itemIndex) || [];
                    return { ...sectionItem, taskGroup: newTaskGroup };
                } else {
                    const newHabitGroup = sectionItem.habitGroup?.filter((_, i) => i !== itemIndex) || [];
                    return { ...sectionItem, habitGroup: newHabitGroup };
                }
            })
        );
    };

    const renderItems = () => {

        return mergedItems.map((item) => {
            const { originalIndex } = item;

            const itemObj = item.type === 'task'
                ? allTasks.find(task => task.id === item.id)
                : allHabits.find(habit => habit.id === item.id);

            if (!itemObj) return null;

            // Is this the item being edited?
            const isEditing = editingItem?.type === item.type && editingItem?.index === originalIndex;
            const itemTimeErrors = isEditing
                ? getItemTimeErrorKeys(section.startTime, section.endTime, editingItem?.startTime, editingItem?.endTime)
                : [];
            const itemTimeErrorMessage = itemTimeErrors.length > 0 ? itemTimeErrors.map((key) => t(key)).join(" ") : "";
            const disableSave = itemTimeErrors.length > 0;

            return (
                <div
                    key={`${item.type}-${item.id}-${originalIndex}`}
                    className="flex min-w-0 items-center gap-2.5 rounded-[9px] border border-border bg-surface px-2.5 py-[7px]"
                >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[13px] text-accent">
                        <BeyouIcon id={itemObj.iconId} />
                    </span>

                    {isEditing ? (
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                                {itemObj.name}
                            </span>
                            <input
                                type="time"
                                aria-label={t("Start time")}
                                value={editingItem.startTime}
                                min={minStart}
                                max={maxEnd}
                                onChange={(e) => setEditingItem(prev =>
                                    prev
                                        ? {
                                            ...prev,
                                            startTime: e.target.value,
                                            endTime:
                                                !isOvernight && prev.endTime && e.target.value && prev.endTime < e.target.value
                                                    ? e.target.value
                                                    : prev.endTime
                                        }
                                        : null
                                )}
                                className={`rounded-lg border bg-surface px-2 py-1 font-mono text-[11.5px] text-text ${disableSave ? "border-danger" : "border-border"}`}
                            />
                            <input
                                type="time"
                                aria-label={t("End time")}
                                value={editingItem.endTime || ""}
                                min={!isOvernight ? editingItem.startTime || minStart : undefined}
                                max={maxEnd}
                                onChange={(e) => setEditingItem(prev =>
                                    prev ? { ...prev, endTime: e.target.value } : null
                                )}
                                className={`rounded-lg border bg-surface px-2 py-1 font-mono text-[11.5px] text-text ${disableSave ? "border-danger" : "border-border"}`}
                            />
                            <button
                                type="button"
                                onClick={() => handleSaveEditItem(editingItem.startTime, editingItem.endTime)}
                                className={`rounded-lg px-2 py-1 text-xs font-semibold text-accent transition-colors duration-200 hover:bg-accent-soft ${disableSave ? "cursor-not-allowed opacity-50" : ""}`}
                                disabled={disableSave}
                            >
                                {t("Save")}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-text-3 transition-colors duration-200 hover:text-text-2"
                            >
                                {t("Cancel")}
                            </button>
                            {itemTimeErrorMessage && (
                                <span className="w-full text-xs text-danger">{itemTimeErrorMessage}</span>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium text-text">
                                    {itemObj.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleStartEditItem(item.type, originalIndex, item.startTime, item.endTime)}
                                    className="mt-0.5 font-mono text-[11px] font-medium text-text-3 transition-colors duration-200 hover:text-text-2 md:hidden"
                                    title={t("Edit")}
                                >
                                    {formatTimeRange(item.startTime, item.endTime)}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleStartEditItem(item.type, originalIndex, item.startTime, item.endTime)}
                                className="hidden shrink-0 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-medium text-text-3 transition-colors duration-200 hover:text-text-2 md:block"
                                title={t("Edit")}
                            >
                                {formatTimeRange(item.startTime, item.endTime)}
                            </button>
                            <button
                                type="button"
                                className="shrink-0 rounded-lg p-1 text-text-3 transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                                aria-label={`${t("Delete")} ${itemObj.name}`}
                                onClick={() => handleDeleteItem(item.type, originalIndex)}
                            >
                                <FiX />
                            </button>
                        </>
                    )}
                </div>
            );
        });
    };

    return (
        // The open section takes the accent border: it is the card being worked
        // on. Closed ones stay neutral, as in the mockup.
        <div
            className={`rounded-control border transition-colors duration-200 ${
                open ? "border-accent bg-bg" : "border-border bg-bg"
            }`}
        >
            <div className="flex items-center gap-2.5 p-2.5">
                {/* The grip has its own column again. The redesign moved the handle onto
                    the section's icon, which reads as an icon and nothing else, so the
                    drag was still there and nobody could see it. Desktop only: rbd wants
                    a long press on touch and this is a 16px target, so below md the
                    arrows in the open body do the reordering instead. */}
                <span
                    {...(dragHandleProps ?? {})}
                    aria-label={t("ReorderItem", { name: section.name })}
                    className="hidden shrink-0 cursor-grab items-center text-text-3 transition-colors duration-200 hover:text-text-2 md:flex"
                >
                    <GripVertical size={16} aria-hidden="true" />
                </span>

                <span className="flex shrink-0 items-center text-text-3">
                    {hasIcon ? <BeyouIcon id={section.iconId} /> : <FiClock />}
                </span>

                {/* On a phone the time drops to a second line: on one line the
                    section's name was left with three letters. */}
                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={() => setOpen((prev) => !prev)}
                        aria-expanded={open}
                        className="flex w-full items-center text-left text-[13.5px] font-semibold text-text"
                    >
                        <span className="min-w-0 flex-1 truncate">{section.name}</span>
                    </button>
                    <span className="mt-1 flex gap-1 md:hidden">
                        <TimeChip>{formatTime(section.startTime)}</TimeChip>
                        <TimeChip>{formatTime(section.endTime)}</TimeChip>
                    </span>
                </div>

                {/* Outside the name column: in there it stuck to the first line while
                    the star, pencil and bin centred on the two-line block. Same hint
                    as the routine card: it expands on tap. */}
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-expanded={open}
                    aria-label={open ? t("Collapse") : t("Expand")}
                    className="shrink-0 rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2 md:hidden"
                >
                    <FiChevronDown
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                </button>

                <span className="hidden shrink-0 items-center gap-1 md:flex">
                    <TimeChip>{formatTime(section.startTime)}</TimeChip>
                    <TimeChip>{formatTime(section.endTime)}</TimeChip>
                </span>

                <button
                    type="button"
                    className={`shrink-0 rounded-lg p-1.5 transition-colors duration-200 hover:bg-surface-2 ${
                        section.favorite ? "text-xp" : "text-text-3"
                    }`}
                    aria-pressed={Boolean(section.favorite)}
                    aria-label={t("Favorite")}
                    onClick={handleFavorite}
                >
                    {section.favorite ? <AiFillStar /> : <AiOutlineStar />}
                </button>
                <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                    aria-label={`${t("Edit")} ${section.name}`}
                    onClick={onEdit}
                >
                    <FiEdit2 />
                </button>
                <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                    aria-label={`${t("Delete")} ${section.name}`}
                    onClick={onDelete}
                >
                    <FiTrash2 />
                </button>
            </div>

            {open && (
                <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
                    {renderItems()}

                    <GhostAdd label={t("Add Habit or task")} onClick={() => setOpenTaskSelector(true)} />

                    {/* Touch's half of the reordering, the grip above being desktop's. They
                        sit inside the open section rather than in the header, where they
                        would be a fifth and sixth target on a 390px row. The native
                        SectionCard puts them in the same place, for the same reason. */}
                    {count > 1 && (
                        <div className="flex items-center justify-end gap-1 md:hidden">
                            <button
                                type="button"
                                aria-label={t("MoveUp")}
                                disabled={index === 0}
                                onClick={() => onMove(-1)}
                                className="rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2 disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                <FiChevronUp aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                aria-label={t("MoveDown")}
                                disabled={index === count - 1}
                                onClick={() => onMove(1)}
                                className="rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2 disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                <FiChevronDown aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {/* The picker opens over the editor, as in the mockup. */}
                    {openTaskSelector && (
                        <TaskAndHabitSelector
                            setRoutineSection={setRoutineSection}
                            index={index}
                            section={section}
                            setOpenTaskSelector={setOpenTaskSelector}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default SectionItem;
