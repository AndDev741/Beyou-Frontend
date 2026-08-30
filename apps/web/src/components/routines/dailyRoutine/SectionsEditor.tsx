import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Draggable, type DropResult } from "react-beautiful-dnd";
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
    /** Tutorial anchor on the new-section button. */
    addTutorialId?: string;
    /** Tutorial anchor on the first section in the list. */
    firstItemTutorialId?: string;
};

/**
 * The routine form's section list, shared by create and edit — the two kept the
 * same copied drag-and-drop tree.
 *
 * What actually differs between them is the react-hook-form state, which stays in
 * each; only the presentation lives here.
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

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(sections);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        setRoutineSection(items);
    };

    /** The arrows' half of the same move, for touch, where the grip is out of reach. */
    const moveSection = (index: number, dir: -1 | 1) => {
        const to = index + dir;
        if (to < 0 || to >= sections.length) return;
        const items = Array.from(sections);
        [items[index], items[to]] = [items[to], items[index]];
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
                                                count={sections.length}
                                                onMove={(dir) => moveSection(index, dir)}
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
