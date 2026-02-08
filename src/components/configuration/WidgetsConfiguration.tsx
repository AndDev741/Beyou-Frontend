import { useTranslation } from "react-i18next";
import WidgetsFabric, { WidgetProps, widgetsIds } from "../widgets/utils/widgetsFabric";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { useMemo, useState } from "react";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import Droppable from "../../components/utils/StrictModeDroppable";
import { t } from "i18next";
import { EditUser } from "../../types/user/EditUser";
import { widgetsIdInUseEnter } from "../../redux/user/perfilSlice";
import SmallButton from "../SmallButton";
import editUser from "../../services/user/editUser";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";

export default function WidgetsConfiguration() {
    const { t } = useTranslation();

    const widgetsIdsInUse = useSelector((state: RootState) => state.perfil.widgetsIdsInUse);

    const [currentWidgets, setCurrentWidgets] = useState<string[]>(widgetsIdsInUse || []);
    const [availableWidgets, setAvailableWidgets] = useState<string[]>(
        widgetsIds.filter(id => !currentWidgets?.includes(id))
    );
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");

    const dispatch = useDispatch();
    const constance = useSelector((state: RootState) => state.perfil.constance);
    const categories = useSelector((state: RootState) => state.categories.categories);
    const categoryWithMoreXp = useMemo(() => 
        categories ? categories.reduce((prev, current) => (prev.xp > current.xp ? prev : current) || [], categories[0]) : null,
    [categories]);
    const categoryWithLessXp = useMemo(() => 
        categories ? categories.reduce((prev, current) => (prev.xp < current.xp ? prev : current) || [], categories[0]) : null,
    [categories]);
    const checkedItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.checkedItemsInScheduledRoutine);
    const totalItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.totalItemsInScheduledRoutine);
    const xp = useSelector((state: RootState) => state.perfil.xp);
    const level = useSelector((state: RootState) => state.perfil.level);
    const nextLevelXp = useSelector((state: RootState) => state.perfil.nextLevelXp);
    const actualLevelXp = useSelector((state: RootState) => state.perfil.actualLevelXp);

    const resetErrorAndSuccessMessage = () => {
        setErrorMessage("");
        setSuccessMessage("");
    }

    const handleOnDragEnd = (result: any) => {
        resetErrorAndSuccessMessage();
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

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        resetErrorAndSuccessMessage();

        const editWidget: EditUser = {
            widgetsId: currentWidgets
        }

        const response = await editUser(editWidget);
        if (response.error) {
            console.error(response.error);
            const friendlyMessage = getFriendlyErrorMessage(t, response.error);
            setErrorMessage(friendlyMessage);
            toast.error(friendlyMessage);
        } else {
            console.log("Widgets edited successfully");
            setSuccessMessage(t('SuccessEditWidgets'));
            toast.success(t('SuccessEditWidgets'));
            dispatch(widgetsIdInUseEnter(currentWidgets));
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-4 bg-background text-secondary transition-colors duration-200 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-1">{t("Widgets")}</h2>
            <p className="text-description text-sm mb-4">{t("Drag and drop to add")}</p>

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
                    xp={xp}
                    level={level}
                    nextLevelXp={nextLevelXp}
                    actualLevelXp={actualLevelXp}
                />

                <DroppableList
                    title={t("Availables")}
                    widgets={availableWidgets}
                    droppableId="availableWidgets"
                    categoryWithMoreXp={categoryWithMoreXp}
                    categoryWithLessXp={categoryWithLessXp}
                    constance={constance}
                    checked={checkedItemsInScheduledRoutine}
                    total={totalItemsInScheduledRoutine}
                    xp={xp}
                    level={level}
                    nextLevelXp={nextLevelXp}
                    actualLevelXp={actualLevelXp}
                />

            </DragDropContext>

            <div className="flex flex-col items-center justify-center w-full">
                <SmallButton
                    text={t('Save')}
                    disabled={false}
                    onClick={onSubmit}
                />
                <p className="text-success">{successMessage}</p>
                <p className="text-error">{errorMessage}</p>
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
    xp,
    level,
    nextLevelXp,
    actualLevelXp,
}: any) {
    return (
        <div className="mb-6 w-full">
            <h3 className="p-1 text-lg font-medium text-secondary">{title}</h3>
            <Droppable
                droppableId={droppableId}
                direction={widgets?.length > 2 ? "vertical" : "horizontal"}
                key={`${droppableId}-${widgets?.length}`}
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-wrap items-center justify-center md:justify-between gap-3 p-1 md:p-4 rounded-xl border-2 border-dashed transition-all md:min-h-[150px]
                        ${snapshot.isDraggingOver ? "border-primary bg-primary/10 min-h-[200px]" : "border-primary/20 bg-background"}
                        ${snapshot.draggingFromThisWith ? "max-h-[630px]" : ""}`}
                    >
                        {widgets?.length === 0 && (
                            <p className="text-sm text-description italic ">
                                {droppableId === "currentWidgets"
                                    ? t("No current widgets")
                                    : t('No widgets available')}
                            </p>
                        )}

                        {widgets?.map((id: string, index: number) => (
                            <Draggable key={id} draggableId={id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`
                                        ${id === "dailyProgress" || id === "fastTips" ? "md:w-full" : ""}
                                        flex items-start gap-2 transition-transform duration-150
                                        ${snapshot.isDragging ? "scale-105 shadow-xl opacity-90" : "scale-100"}`}
                                    >
                                        <div
                                            {...provided.dragHandleProps}
                                            className="cursor-grab select-none mt-3 mr-1 text-icon"
                                        >
                                            ⠿
                                        </div>

                                        <div className={`${id === "dailyProgress" || id === "fastTips" || id === "levelProgress" ? "md:w-full" : ""}`}>
                                            <WidgetsFabric
                                                key={id}
                                                widgetId={id as keyof WidgetProps}
                                                categoriePassed={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                                constance={constance}
                                                checked={checked}
                                                total={total}
                                                xp={xp}
                                                level={level}
                                                nextLevelXp={nextLevelXp}
                                                actualLevelXp={actualLevelXp}
                                                draggable
                                            />
                                        </div>

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
