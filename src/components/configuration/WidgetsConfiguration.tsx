import { useTranslation } from "react-i18next";
import WidgetsFabric, { WidgetProps, widgetsIds } from "../widgets/utils/widgetsFabric";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { useState } from "react";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import Droppable from "../../components/utils/StrictModeDroppable";
import { set } from "date-fns";

export default function WidgetsConfiguration() {
    const { t } = useTranslation();

    const [currentWidgets, setCurrentWidgets] = useState<string[]>([]);
    const [availableWidgets, setAvailableWidgets] = useState<string[]>(widgetsIds);

    const constance = useSelector((state: RootState) => state.perfil.constance);
    const categoryWithMoreXp = useSelector((state: RootState) => state.perfil.categoryWithMoreXp);
    const categoryWithLessXp = useSelector((state: RootState) => state.perfil.categoryWithLessXp);
    const checkedItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.checkedItemsInScheduledRoutine);
    const totalItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.totalItemsInScheduledRoutine);

    console.log("Current Widgets: ", currentWidgets);
    console.log("Available Widgets: ", availableWidgets);

    const handleOnDragEnd = (result: any) => {
        console.log("result", result);
        if (result?.destination?.droppableId === "currentWidgets") {
            console.log("Adding widget", result.draggableId);
            setCurrentWidgets(prev => {
                if (prev.includes(result.draggableId)) {
                    return prev;
                }
                return [...prev, result.draggableId];
            });
            
            setAvailableWidgets(prev => prev.filter(id => id !== result.draggableId));
        } else if (result?.destination?.droppableId === "availableWidgets") {
            console.log("Removing widget", result.draggableId);
            setCurrentWidgets(prev => prev.filter(id => id !== result.draggableId));

            setAvailableWidgets(prev => {
                if(prev.includes(result.draggableId)) {
                    return prev
                } 
                return [...prev, result.draggableId];
            });
        }
    }

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-2">
            <h2 className="text-2xl font-semibold">{t('Widgets')}</h2>
            <p className="text-gray-500 text-sm">{t('Drag and drop to add')}</p>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                <h3 className="p-2 text-lg font-medium">{t('Current')}</h3>
                <Droppable droppableId="currentWidgets">
                    {(provided) => (
                        <div className="px-2 flex flex-wrap items-center justify-evenly gap-2 min-h-[100px] w-full"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {currentWidgets.map((id, index) => (
                                <Draggable
                                    key={id}
                                    draggableId={id}
                                    index={index}
                                >
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex flex-wrap items-start justify-evenly">
                                            <div
                                                {...provided.dragHandleProps}
                                                className="cursor-grab mt-3 mr-2"
                                            >
                                                ⠿
                                            </div>
                                            <WidgetsFabric key={id}
                                                widgetId={id as keyof WidgetProps}
                                                category={id === 'betterArea' ? categoryWithMoreXp : categoryWithLessXp}
                                                constance={constance}
                                                checked={checkedItemsInScheduledRoutine}
                                                total={totalItemsInScheduledRoutine}
                                                draggable={true}
                                            />
                                        </div>
                                    )}

                                </Draggable>
                            ))}
                            {provided.placeholder}

                        </div>
                    )}
                </Droppable>

                <h3 className="p-2 text-lg font-medium">{t('Availables')}</h3>
                <Droppable droppableId="availableWidgets">
                    {(provided) => (
                        <div className="px-2 flex flex-wrap items-center justify-evenly gap-2  min-h-[100px] w-full"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >

                            {availableWidgets.map((id, index) => (
                                <Draggable
                                    key={id}
                                    draggableId={id}
                                    index={index}
                                >
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex flex-wrap items-start justify-evenly">
                                            <div
                                                {...provided.dragHandleProps}
                                                className="cursor-grab mt-3 mr-2"
                                            >
                                                ⠿
                                            </div>
                                            <WidgetsFabric key={id}
                                                widgetId={id as keyof WidgetProps}
                                                category={id === 'betterArea' ? categoryWithMoreXp : categoryWithLessXp}
                                                constance={constance}
                                                checked={checkedItemsInScheduledRoutine}
                                                total={totalItemsInScheduledRoutine}
                                                draggable={true}
                                            />
                                        </div>
                                    )}

                                </Draggable>

                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

            </DragDropContext>

        </div>
    )
}