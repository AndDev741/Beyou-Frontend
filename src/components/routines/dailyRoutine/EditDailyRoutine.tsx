import { useEffect, useState } from "react";
import AddIcon from '../../../assets/addIcon.svg';
import { useTranslation } from "react-i18next";
import CreateRoutineSection from "./CreateRoutineSection";
import { RoutineSection } from "../../../types/routine/routineSection";
import { IconObject } from "../../../types/icons/IconObject";
import SectionItem from "./SectionItem";
import Button from "../../Button";
import { Routine } from "../../../types/routine/routine";
import createRoutine from "../../../services/routine/createRoutine";
import { useDispatch, useSelector } from "react-redux";
import { enterRoutines } from "../../../redux/routine/routinesSlice";
import getRoutines from "../../../services/routine/getRoutines";
import { RootState } from "../../../redux/rootReducer";
import { editModeEnter } from "../../../redux/routine/editRoutineSlice";
import editRoutine from "../../../services/routine/editRoutine";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import Droppable from "../../../components/utils/StrictModeDroppable";

type EditDailyRoutineProps = {}

const EditDailyRoutine = ({ }: EditDailyRoutineProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const routineToEdit = useSelector((state: RootState) => state.editRoutine.routine);
    const routineNameToEdit = routineToEdit?.name;
    const routineSectionsToEdit = routineToEdit?.routineSections;

    const [routineName, setRoutineName] = useState<string>(routineNameToEdit || "");
    const [routineSection, setRoutineSection] = useState<RoutineSection[]>(routineSectionsToEdit || []);
    const [showModal, setShowModal] = useState(false);

    const [editIndex, setEditIndex] = useState<number | null>(null);

    const [errorMessage, setErrorMessage] = useState("");

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setShowModal(false);
            setEditIndex(null);
        }
    };

    const handleDeleteSection = (index: number) => {
        setRoutineSection(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditSection = (index: number) => {
        setEditIndex(index);
        setShowModal(true);
    };

    const handleUpdateSection = (updatedSection: RoutineSection) => {
        console.log("updatedSection", updatedSection);
        if (editIndex !== null) {
            setRoutineSection(prev =>
                prev.map((section, idx) => (idx === editIndex ? updatedSection : section))
            );
            setEditIndex(null);
            setShowModal(false);
        }
    };

    const handleEdit = async () => {
        setErrorMessage("");

        const routine: Routine = {
            id: routineToEdit.id,
            name: routineName,
            iconId: "",
            routineSections: routineSection
        }

        const response = await editRoutine(routine, t);

        console.log(response)
        if (response?.error || response?.validation) {
            setErrorMessage(response.error || response?.validation);
        } else {
            const routines = await getRoutines(t);
            dispatch(enterRoutines(routines?.success));
            setRoutineName("");
            setRoutineSection([]);
            dispatch(editModeEnter(false));
        }

    }

    const handleOnDragEnd = (result: any) => {
        console.log("result", result);
        if (!result.destination) return;
        const items = Array.from(routineSection);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setRoutineSection(items);
    }

    return (
        <div className="w-full flex flex-col items-center justify-center">
            <h2 className='text-2xl'>{t("Editing daily routine")}</h2>

            <div className="relative w-[95%] flex flex-col items-center justify-start border-2 border-blueMain rounded-lg p-3 mt-4 bg-white shadow-sm min-h-[400px]">

                <input
                    type="text"
                    value={routineName}
                    onChange={e => setRoutineName(e.target.value)}
                    className="mb-6 w-[65%] px-4 py-2 border-0 border-b-2 border-b-blueMain rounded-none text-2xl font-semibold text-center focus:outline-none"
                    placeholder={t("Routine name")}
                />

                <button
                    className="absolute top-3 right-3 flex flex-col items-center"
                    onClick={() => { setShowModal(true); setEditIndex(null); }}
                >
                    <img
                        src={AddIcon}
                        alt={t('Routines icon alt')}
                        className="w-8 h-8"
                    />
                    <span className='text-sm text-center font-medium mt-1 whitespace-pre-line'>
                        {t("add section")}
                    </span>
                </button>


                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="sections">
                        {(provided) => (
                            <div className="w-full flex flex-col items-center justify-start mt-5"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {routineSection.length > 0 ? (
                                    routineSection.map((section, index) => (
                                        <Draggable
                                            key={section.id.toString()}
                                            draggableId={section.id.toString()}
                                            index={index}
                                        >
                                            {(provided) => (
                                                <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-start w-full">
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="cursor-grab mt-3 mr-2"
                                                    >
                                                        ⠿
                                                    </div>
                                                    <SectionItem
                                                        section={section}
                                                        onEdit={() => handleEditSection(index)}
                                                        onDelete={() => handleDeleteSection(index)}
                                                        setRoutineSection={setRoutineSection}
                                                        index={index}
                                                    />
                                                </div>

                                            )}
                                        </Draggable>
                                    ))
                                ) : (
                                    <p className="text-gray-500">{t("No sections added")}</p>
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {showModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    onClick={handleOverlayClick}
                >
                    <div className="bg-white rounded-lg shadow-lg p-8 min-w-[350px] max-w-lg w-[93%] relative" onClick={e => e.stopPropagation()}>
                        <CreateRoutineSection
                            setRoutineSection={editIndex === null ? setRoutineSection : (updatedSections => {
                                if (updatedSections.length > routineSection.length) {
                                    setRoutineSection(updatedSections);
                                } else if (editIndex !== null) {
                                    handleUpdateSection(updatedSections[editIndex]);
                                }
                            })}
                            onClose={() => { setShowModal(false); setEditIndex(null); }}
                            onUpdateSection={handleUpdateSection}
                            editIndex={editIndex}
                            editSection={editIndex !== null ? routineSection[editIndex] : undefined}
                        />
                    </div>
                </div>
            )}
            <div className="my-2 mb-6 flex flex-col items-center"
                onClick={handleEdit}
            >
                <div className="w-full flex">
                    <button
                        className='w-[120px] md:w-[200px] h-[45px] bg-blueMain rounded-[20px] text-white text-lg lg:text-2xl font-semibold hover:bg-ligthBlue hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 mx-4'>
                        {t('Edit')}
                    </button>


                    <button type='button'
                        onClick={() => dispatch(editModeEnter(false))}
                        className='w-[120px] md:w-[200px] h-[45px] bg-gray-500 rounded-[20px] text-white text-lg lg:text-2xl font-semibold hover:bg-gray-400 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 mx-4'>
                        {t('Cancel')}
                    </button>
                </div>
                <p className="text-center text-red-700 mt-2">{errorMessage}</p>
            </div>

        </div>
    )
}

export default EditDailyRoutine;