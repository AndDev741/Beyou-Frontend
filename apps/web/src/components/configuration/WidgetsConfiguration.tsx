import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import { GripVertical, X, Plus, Target, Flame, Award, ChartPie, ArrowUpRight, Gauge, Lightbulb } from "lucide-react";
import Droppable from "../../components/utils/StrictModeDroppable";
import { widgetsIds } from "../widgets/utils/widgetsFabric";
import { RootState } from "@beyou/state/rootReducer";
import { EditUser } from "@beyou/types/user/EditUser";
import { widgetsIdInUseEnter } from "@beyou/state/user/perfilSlice";
import editUser from "@beyou/api/user/editUser";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";

/** Nome e ícone de cada widget — a lista mostra a identidade, não o widget. */
const WIDGET_META: Record<string, { labelKey: string; Icon: typeof Target }> = {
    dailyProgress: { labelKey: "Today", Icon: Target },
    constance: { labelKey: "Constance", Icon: Flame },
    levelProgress: { labelKey: "Level", Icon: Award },
    categoryBalance: { labelKey: "LifeBalance", Icon: ChartPie },
    betterArea: { labelKey: "Better Area", Icon: ArrowUpRight },
    worstArea: { labelKey: "Worst Area", Icon: Gauge },
    fastTips: { labelKey: "Fast Tips", Icon: Lightbulb },
};

/**
 * A lista do mockup: cada widget do dashboard é uma linha compacta com alça de
 * arraste, posição, ícone, nome e o × para tirar. Os que sobraram viram chips
 * de "+ nome" embaixo.
 *
 * Antes isto renderizava os widgets DE VERDADE dentro de duas zonas
 * tracejadas — bonito de ver, impossível de ordenar no telefone e sem dizer a
 * ordem em que eles aparecem. E salvava só no botão; agora cada mudança
 * persiste sozinha.
 */
export default function WidgetsConfiguration() {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const widgetsIdsInUse = useSelector((state: RootState) => state.perfil.widgetsIdsInUse);
    const [currentWidgets, setCurrentWidgets] = useState<string[]>(widgetsIdsInUse || []);
    const availableWidgets = widgetsIds.filter((id) => !currentWidgets.includes(id));
    // A primeira renderização não deve disparar um PUT.
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const persist = async () => {
            const payload: EditUser = { widgetsId: currentWidgets };
            const response = await editUser(payload);
            if (response?.error) {
                toast.error(getFriendlyErrorMessage(t, response.error));
                return;
            }
            dispatch(widgetsIdInUseEnter(currentWidgets));
        };
        persist();
    }, [currentWidgets, dispatch, t]);

    const handleOnDragEnd = (result: any) => {
        if (!result.destination) return;
        setCurrentWidgets((prev) => {
            const items = Array.from(prev);
            const [moved] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, moved);
            return items;
        });
    };

    const add = (id: string) => setCurrentWidgets((prev) => [...prev, id]);
    const remove = (id: string) => setCurrentWidgets((prev) => prev.filter((item) => item !== id));

    const labelOf = (id: string) => t(WIDGET_META[id]?.labelKey ?? id);

    return (
        <div className="w-full">
            <p className="mb-3 text-xs text-text-3">{t("WidgetsHint")}</p>

            <h3 className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t("WidgetsInDashboard")}</h3>
            <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="currentWidgets">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-1.5">
                            {currentWidgets.length === 0 && (
                                <p className="rounded-control border border-dashed border-border px-3 py-4 text-center text-xs text-text-3">
                                    {t("No widgets added yet")}
                                </p>
                            )}

                            {currentWidgets.map((id, index) => {
                                const Icon = WIDGET_META[id]?.Icon ?? Target;
                                return (
                                    <Draggable key={id} draggableId={id} index={index}>
                                        {(dragProvided, snapshot) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                className={`flex items-center gap-2.5 rounded-control border bg-surface px-2.5 py-2 transition-colors duration-200 ${
                                                    snapshot.isDragging ? "border-accent shadow-surface" : "border-border"
                                                }`}
                                            >
                                                <span
                                                    {...(dragProvided.dragHandleProps ?? {})}
                                                    className="flex cursor-grab items-center text-text-3"
                                                    aria-label={t("Reorder")}
                                                >
                                                    <GripVertical size={15} aria-hidden="true" />
                                                </span>
                                                <span className="w-3 shrink-0 font-mono text-[11px] text-text-3">{index + 1}</span>
                                                <Icon size={14} aria-hidden="true" className="shrink-0 text-accent" />
                                                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-text">
                                                    {labelOf(id)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => remove(id)}
                                                    aria-label={`${t("Remove")} ${labelOf(id)}`}
                                                    className="shrink-0 rounded-lg p-1 text-text-3 transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                                                >
                                                    <X size={14} aria-hidden="true" />
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

            {availableWidgets.length > 0 && (
                <div className="mt-4">
                    <h3 className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t("Availables")}</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {availableWidgets.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => add(id)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11.5px] font-semibold text-text-3 transition-colors duration-200 hover:border-accent hover:text-accent"
                            >
                                <Plus size={13} aria-hidden="true" />
                                {labelOf(id)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
