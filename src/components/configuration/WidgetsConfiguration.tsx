import { useTranslation } from "react-i18next";
import WidgetsFabric, { WidgetProps, widgetsIds } from "../widgets/utils/widgetsFabric";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { useState } from "react";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import Droppable from "../../components/utils/StrictModeDroppable";
import { t } from "i18next";

export default function WidgetsConfiguration() {
    const { t } = useTranslation();

    const [currentWidgets, setCurrentWidgets] = useState<string[]>([]);
    const [availableWidgets, setAvailableWidgets] = useState<string[]>(widgetsIds);

    const constance = useSelector((state: RootState) => state.perfil.constance);
    const categoryWithMoreXp = useSelector((state: RootState) => state.perfil.categoryWithMoreXp);
    const categoryWithLessXp = useSelector((state: RootState) => state.perfil.categoryWithLessXp);
    const checkedItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.checkedItemsInScheduledRoutine);
    const totalItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.totalItemsInScheduledRoutine);

    const handleOnDragEnd = (result: any) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        // 🟡 Drag in the same list
        if (source.droppableId === destination.droppableId) {
            if (source.droppableId === "currentWidgets") {
                setCurrentWidgets(prev => {
                    const items = Array.from(prev);
                    const [moved] = items.splice(source.index, 1);
                    items.splice(destination.index, 0, moved);
                    return items;
                });
            } else if (source.droppableId === "availableWidgets") {
                setAvailableWidgets(prev => {
                    const items = Array.from(prev);
                    const [moved] = items.splice(source.index, 1);
                    items.splice(destination.index, 0, moved);
                    return items;
                });
            }
        }

        // 🔵 Drag between different lists
        else {
            if (destination.droppableId === "currentWidgets") {
                setAvailableWidgets(prev => prev.filter(id => id !== draggableId));
                setCurrentWidgets(prev => {
                    const items = Array.from(prev);
                    if (!items.includes(draggableId)) {
                        items.splice(destination.index, 0, draggableId); // Inserction in the right index
                    }
                    return items;
                });
            } else if (destination.droppableId === "availableWidgets") {
                setCurrentWidgets(prev => prev.filter(id => id !== draggableId));
                setAvailableWidgets(prev => {
                    const items = Array.from(prev);
                    if (!items.includes(draggableId)) {
                        items.splice(destination.index, 0, draggableId);
                    }
                    return items;
                });
            }
        }
    };


    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4">
            <h2 className="text-2xl font-semibold mb-1">{t("Widgets")}</h2>
            <p className="text-gray-500 text-sm mb-4">{t("Drag and drop to add")}</p>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                <DroppableList
                    title={t("Current")}
                    widgets={currentWidgets}
                    droppableId="currentWidgets"
                    categoryWithMoreXp={categoryWithMoreXp}
                    categoryWithLessXp={categoryWithLessXp}
                    constance={constance}
                    checked={checkedItemsInScheduledRoutine}
                    total={totalItemsInScheduledRoutine}
                />
                <DroppableList
                    title={t("Available")}
                    widgets={availableWidgets}
                    droppableId="availableWidgets"
                    categoryWithMoreXp={categoryWithMoreXp}
                    categoryWithLessXp={categoryWithLessXp}
                    constance={constance}
                    checked={checkedItemsInScheduledRoutine}
                    total={totalItemsInScheduledRoutine}
                />
            </DragDropContext>

            <div className="flex items-center justify-center w-full">
                <button
                    //onClick={onSubmit}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('Save')}
                </button>
            </div>
        </div>
    );
}

function DroppableList({
    title,
    widgets,
    droppableId,
    categoryWithMoreXp,
    categoryWithLessXp,
    constance,
    checked,
    total,
}: any) {
    return (
        <div className="mb-6 w-full">
            <h3 className="p-1 text-lg font-medium">{title}</h3>
            <Droppable droppableId={droppableId} direction={widgets.length > 2 ? "vertical" : "horizontal"}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-wrap items-center justify-center gap-3 p-1 rounded-xl border-2 border-dashed transition-all ${snapshot.isDraggingOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"
                            }`}
                    >
                        {widgets.length === 0 && (
                            <p className="text-sm text-gray-400 italic">
                                {title === "Current"
                                    ? t("No current widgets")
                                    : t('No widgets available')}
                            </p>
                        )}

                        {widgets.map((id: string, index: number) => (
                            <Draggable key={id} draggableId={id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-start gap-2 transition-transform duration-150
                      ${snapshot.isDragging ? "scale-105 shadow-lg opacity-90" : "scale-100"}`}
                                    >
                                        <div
                                            {...provided.dragHandleProps}
                                            className="cursor-grab select-none mt-3 mr-1 text-gray-500"
                                        >
                                            ⠿
                                        </div>

                                        <WidgetsFabric
                                            key={id}
                                            widgetId={id as keyof WidgetProps}
                                            category={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                            constance={constance}
                                            checked={checked}
                                            total={total}
                                            draggable
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}