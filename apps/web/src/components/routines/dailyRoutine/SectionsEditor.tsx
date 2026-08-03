import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import Droppable from "../../utils/StrictModeDroppable";
import GhostAdd from "../../../ui/GhostAdd";
import SectionItem from "./SectionItem";

type SectionsEditorProps = {
    sections: RoutineSection[];
    setRoutineSection: Dispatch<SetStateAction<RoutineSection[]>>;
    onEditSection: (index: number) => void;
    onDeleteSection: (index: number) => void;
    onAddSection: () => void;
    /** Âncora do tutorial no botão de nova seção. */
    addTutorialId?: string;
    /** Âncora do tutorial na primeira seção da lista. */
    firstItemTutorialId?: string;
};

/**
 * A lista de seções do formulário de rotina, compartilhada por criar e editar —
 * os dois mantinham a mesma árvore de drag-and-drop copiada.
 *
 * O que muda de verdade entre eles é o estado do react-hook-form, que continua
 * em cada um; aqui mora só a apresentação.
 */
export default function SectionsEditor({
    sections,
    setRoutineSection,
    onEditSection,
    onDeleteSection,
    onAddSection,
    addTutorialId,
    firstItemTutorialId,
}: SectionsEditorProps) {
    const { t } = useTranslation();

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(sections);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        setRoutineSection(items);
    };

    return (
        <div>
            <span className="mb-2 block text-[13px] font-semibold text-text-2">{t("Sections")}</span>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sections">
                    {(provided) => (
                        <div
                            className="flex flex-col gap-2"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {sections.map((section, index) => (
                                <Draggable
                                    key={section.id.toString()}
                                    draggableId={section.id.toString()}
                                    index={index}
                                >
                                    {(dragProvided) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            data-tutorial-id={index === 0 ? firstItemTutorialId : undefined}
                                        >
                                            <SectionItem
                                                section={section}
                                                onEdit={() => onEditSection(index)}
                                                onDelete={() => onDeleteSection(index)}
                                                setRoutineSection={setRoutineSection}
                                                index={index}
                                                dragHandleProps={dragProvided.dragHandleProps ?? undefined}
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

            <GhostAdd
                label={t("New section")}
                onClick={onAddSection}
                className={sections.length > 0 ? "mt-2" : ""}
                testId="add-section"
                tutorialId={addTutorialId}
            />
        </div>
    );
}
