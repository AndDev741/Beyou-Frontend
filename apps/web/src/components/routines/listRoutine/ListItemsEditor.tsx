import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { DragDropContext, Draggable, type DropResult } from "react-beautiful-dnd";
import { FiTrash2 } from "react-icons/fi";
import { GripVertical } from "lucide-react";
import { RootState } from "@beyou/state/rootReducer";
import type { RoutineListItem } from "@beyou/types/routine/routine";
import Droppable from "../../utils/StrictModeDroppable";
import GhostAdd from "../../../ui/GhostAdd";
import BeyouIcon from "../../../ui/BeyouIcon";

type ListItemsEditorProps = {
    items: RoutineListItem[];
    setItems: Dispatch<SetStateAction<RoutineListItem[]>>;
    onAddItem: () => void;
};

/**
 * The ordered entries of a LIST routine, dragged into whatever order the user wants.
 *
 * Order here is the whole ordering model. A daily routine sorts its items by start time and
 * needs no handles; a list has no times, so position in this array is the only thing that
 * says what comes first, and it is sent to the server as exactly that.
 */
export default function ListItemsEditor({ items, setItems, onAddItem }: ListItemsEditorProps) {
    const { t } = useTranslation();
    const habits = useSelector((state: RootState) => state.habits.habits) || [];
    const tasks = useSelector((state: RootState) => state.tasks.tasks) || [];

    const describe = (item: RoutineListItem) => {
        const source = item.type === "HABIT" ? habits : tasks;
        const refId = item.type === "HABIT" ? item.habitId : item.taskId;
        const found = source.find((entry: { id: string }) => entry.id === refId);
        return {
            name: found?.name ?? t("Unknown"),
            iconId: found?.iconId ?? "",
        };
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const next = Array.from(items);
        const [moved] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, moved);
        setItems(next);
    };

    const remove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

    return (
        <div>
            <span className="mb-2 block text-[13px] font-semibold text-text-2">{t("Items")}</span>

            {items.length === 0 && (
                <p className="rounded-control border border-dashed border-border px-3 py-4 text-center text-[13px] text-text-3">
                    {t("ListRoutineEmptyHint")}
                </p>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="list-items">
                    {(provided) => (
                        <div
                            className="flex flex-col gap-2"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {items.map((item, index) => {
                                const { name, iconId } = describe(item);
                                // A row that has never been saved has no group id, so the key
                                // falls back to what it points at plus its position.
                                const key = item.id || `${item.type}:${item.habitId ?? item.taskId}:${index}`;
                                return (
                                    <Draggable key={key} draggableId={key} index={index}>
                                        {(dragProvided) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                className="flex items-center gap-2.5 rounded-control border border-border bg-surface px-3 py-2.5"
                                            >
                                                <span
                                                    {...(dragProvided.dragHandleProps ?? {})}
                                                    aria-label={t("ReorderItem", { name })}
                                                    className="cursor-grab text-text-3"
                                                >
                                                    <GripVertical size={16} aria-hidden="true" />
                                                </span>
                                                <BeyouIcon id={iconId} size={18} />
                                                <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                                                    {name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    aria-label={t("Remove") + " " + name}
                                                    className="shrink-0 text-text-3 hover:text-danger"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <GhostAdd
                label={t("AddHabitOrTask")}
                onClick={onAddItem}
                className={items.length > 0 ? "mt-2" : "mt-2"}
                testId="add-list-item"
            />
        </div>
    );
}
