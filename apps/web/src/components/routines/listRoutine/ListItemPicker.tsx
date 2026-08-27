import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FiSearch, FiX } from "react-icons/fi";
import { RootState } from "@beyou/state/rootReducer";
import type { RoutineListItem } from "@beyou/types/routine/routine";
import BeyouIcon from "../../../ui/BeyouIcon";
import Button from "../../Button";
import SegmentedControl from "../../../ui/SegmentedControl";
import QuickCreateHabitModal from "../dailyRoutine/taskSelector/QuickCreateHabitModal";
import QuickCreateTaskModal from "../dailyRoutine/taskSelector/QuickCreateTaskModal";

type Kind = "habit" | "task";

type Candidate = {
    id: string;
    name: string;
    iconId: string;
    category: string;
    alreadyIn: boolean;
};

type ListItemPickerProps = {
    /** What the list already holds, so those rows show as taken rather than as duplicates. */
    items: RoutineListItem[];
    onAdd: (picked: Array<{ type: "HABIT" | "TASK"; refId: string }>) => void;
    onClose: () => void;
};

/**
 * The habit/task picker for a LIST routine.
 *
 * Deliberately not TaskAndHabitSelector, which the daily form uses. That component's whole
 * middle is a tray of time fields and a suggestSlots call to fill them, and a list has no
 * times to edit — reusing it would have meant threading a "hide the times" flag through
 * every row of it and leaving the slot-suggestion logic running for values nobody reads.
 */
export default function ListItemPicker({ items, onAdd, onClose }: ListItemPickerProps) {
    const { t } = useTranslation();
    const habits = useSelector((state: RootState) => state.habits.habits) || [];
    const tasks = useSelector((state: RootState) => state.tasks.tasks) || [];
    const categories = useSelector((state: RootState) => state.categories.categories) || [];

    const [kind, setKind] = useState<Kind>("habit");
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [showQuickHabit, setShowQuickHabit] = useState(false);
    const [showQuickTask, setShowQuickTask] = useState(false);

    const takenHabitIds = useMemo(
        () => new Set(items.filter((i) => i.type === "HABIT").map((i) => i.habitId)),
        [items],
    );
    const takenTaskIds = useMemo(
        () => new Set(items.filter((i) => i.type === "TASK").map((i) => i.taskId)),
        [items],
    );

    const categoryName = (ids?: string[]) => {
        const first = ids?.[0];
        if (!first) return "";
        return categories.find((c: { id: string; name: string }) => c.id === first)?.name ?? "";
    };

    const candidates: Candidate[] = useMemo(() => {
        const source = kind === "habit" ? habits : tasks;
        const taken = kind === "habit" ? takenHabitIds : takenTaskIds;
        const needle = query.trim().toLowerCase();
        return source
            .map((entry: { id: string; name: string; iconId: string; categoriesId?: string[] }) => ({
                id: entry.id,
                name: entry.name,
                iconId: entry.iconId,
                category: categoryName(entry.categoriesId),
                alreadyIn: taken.has(entry.id),
            }))
            .filter((c: Candidate) => (needle ? c.name.toLowerCase().includes(needle) : true));
    }, [kind, habits, tasks, takenHabitIds, takenTaskIds, query, categories]);

    const toggle = (id: string) => {
        const key = `${kind}:${id}`;
        setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const confirm = () => {
        onAdd(
            [...picked].map((key) => {
                const [entryKind, refId] = key.split(":");
                return { type: entryKind === "habit" ? "HABIT" : "TASK", refId } as const;
            }),
        );
        onClose();
    };

    return (
        <div className="text-text">
            <div className="flex items-center justify-between">
                <h2 id="list-item-picker-title" className="text-base font-semibold">{t("AddToList")}</h2>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="text-text-3">
                    <FiX />
                </button>
            </div>

            <div className="mt-3">
                <SegmentedControl
                    className="w-full"
                    label={t("AddToList")}
                    value={kind}
                    onChange={(value) => {
                        setKind(value as Kind);
                        setQuery("");
                    }}
                    options={[
                        { value: "habit", label: t("Habits") },
                        { value: "task", label: t("Tasks") },
                    ]}
                />
            </div>

            <div className="relative mt-3">
                <FiSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("SearchHabitOrTask")}
                    aria-label={t("SearchHabitOrTask")}
                    className="w-full rounded-control border border-border bg-surface py-2.5 pl-9 pr-3 text-[13.5px] placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
            </div>

            <div className="mt-3 max-h-[45vh] space-y-1.5 overflow-y-auto">
                {candidates.length === 0 && (
                    <p className="py-6 text-center text-[13px] text-text-3">{t("NothingFound")}</p>
                )}
                {candidates.map((candidate) => (
                    <label
                        key={candidate.id}
                        className={`flex items-center gap-2.5 rounded-control border border-border px-3 py-2 ${
                            candidate.alreadyIn ? "opacity-50" : "cursor-pointer hover:bg-surface-2"
                        }`}
                    >
                        <input
                            type="checkbox"
                            className="accent-primary h-4 w-4"
                            disabled={candidate.alreadyIn}
                            checked={candidate.alreadyIn || picked.has(`${kind}:${candidate.id}`)}
                            onChange={() => toggle(candidate.id)}
                            aria-label={
                                candidate.alreadyIn
                                    ? t("AlreadyInList", { name: candidate.name })
                                    : candidate.name
                            }
                        />
                        <BeyouIcon id={candidate.iconId} size={18} />
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{candidate.name}</span>
                        {candidate.category && (
                            <span className="shrink-0 text-xs text-text-3">{candidate.category}</span>
                        )}
                    </label>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                    text={kind === "habit" ? t("CreateHabit") : t("CreateTask")}
                    mode="ghost"
                    size="medium"
                    onClick={() => (kind === "habit" ? setShowQuickHabit(true) : setShowQuickTask(true))}
                />
                <Button text={t("Cancel")} mode="ghost" size="medium" onClick={onClose} />
                <Button
                    text={picked.size > 0 ? `${t("Add")} ${picked.size}` : t("Add")}
                    mode="primary"
                    size="medium"
                    disabled={picked.size === 0}
                    onClick={confirm}
                />
            </div>

            {/* Created straight into the list, so "I need a habit for this" does not mean
                leaving the form and losing what is already picked. */}
            <QuickCreateHabitModal
                isOpen={showQuickHabit}
                onClose={() => setShowQuickHabit(false)}
                onCreated={(habitId) => {
                    if (habitId) onAdd([{ type: "HABIT", refId: habitId }]);
                    setShowQuickHabit(false);
                }}
            />
            <QuickCreateTaskModal
                isOpen={showQuickTask}
                onClose={() => setShowQuickTask(false)}
                onCreated={(taskId) => {
                    if (taskId) onAdd([{ type: "TASK", refId: taskId }]);
                    setShowQuickTask(false);
                }}
            />
        </div>
    );
}
