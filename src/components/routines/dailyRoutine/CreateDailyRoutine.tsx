import { useState } from "react";
import { useTranslation } from "react-i18next";
import CreateRoutineSection from "./CreateRoutineSection";
import { RoutineSection } from "../../../types/routine/routineSection";
import SectionItem from "./SectionItem";
import Button from "../../Button";
import { Routine } from "../../../types/routine/routine";
import createRoutine from "../../../services/routine/createRoutine";
import { useDispatch, useSelector } from "react-redux";
import { enterRoutines } from "../../../redux/routine/routinesSlice";
import getRoutines from "../../../services/routine/getRoutines";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import Droppable from "../../../components/utils/StrictModeDroppable";
import { CgAddR } from "react-icons/cg";
import { RootState } from "../../../redux/rootReducer";
import { toast } from "react-toastify";
import { getItemTimeErrorKeys, getSectionErrorKeys } from "./routineValidation";
import ErrorNotice from "../../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../../services/apiError";

const CreateDailyRoutine = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [routineName, setRoutineName] = useState<string>("");
    const [routineSection, setRoutineSection] = useState<RoutineSection[]>([]);
    console.log("routineSection", routineSection);
    const [showModal, setShowModal] = useState(false);
    const routines = useSelector((state: RootState) => state.routines.routines) || [];

    const [editIndex, setEditIndex] = useState<number | null>(null);

    const [errorMessage, setErrorMessage] = useState("");
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

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

    const handleCreate = async () => {
        setErrorMessage("");
        setApiError(null);

        console.log(routineSection.filter(section => section.id = ""))

        if (!routineName.trim()) {
            const message = t("YupNameRequired");
            setErrorMessage(message);
            toast.error(message);
            return;
        }

        if (routineSection.length === 0) {
            const message = t("At least, 1 section need to be created");
            setErrorMessage(message);
            toast.error(message);
            return;
        }

        for (const section of routineSection) {
            const sectionErrors = getSectionErrorKeys(section.name, section.startTime);
            if (sectionErrors.length > 0) {
                const message = t(sectionErrors[0]);
                setErrorMessage(message);
                toast.error(message);
                return;
            }

            const taskGroups = section.taskGroup || [];
            for (const taskGroup of taskGroups) {
                const itemErrors = getItemTimeErrorKeys(section.startTime, section.endTime, taskGroup.startTime, taskGroup.endTime);
                if (itemErrors.length > 0) {
                    const message = t(itemErrors[0]);
                    setErrorMessage(message);
                    toast.error(message);
                    return;
                }
            }

            const habitGroups = section.habitGroup || [];
            for (const habitGroup of habitGroups) {
                const itemErrors = getItemTimeErrorKeys(section.startTime, section.endTime, habitGroup.startTime, habitGroup.endTime);
                if (itemErrors.length > 0) {
                    const message = t(itemErrors[0]);
                    setErrorMessage(message);
                    toast.error(message);
                    return;
                }
            }
        }

        const routine: Routine = {
            name: routineName,
            type: "DAILY",
            iconId: "",
            routineSections: routineSection.map(section => ({
                ...section,
                id: section.id ?? ""
            }))
        }

        const response = await createRoutine(routine, t);

        console.log(response)
        const error = response?.error || response?.validation;
        if (error) {
            if (typeof error === "string") {
                setErrorMessage(error);
                toast.error(error);
            } else {
                setApiError(error);
                toast.error(getFriendlyErrorMessage(t, error));
            }
            return;
        }

        const routines = await getRoutines(t);
        dispatch(enterRoutines(routines?.success));
        setRoutineName("");
        setRoutineSection([]);
        toast.success(t("created successfully"));

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
        <div className="w-full flex flex-col items-center justify-center text-secondary">
            <h2 className='text-2xl text-secondary'>{t("Creating daily routine")}</h2>

            <div className="relative md:w-[95%] flex flex-col items-center justify-start border-2 border-primary rounded-lg p-3 mt-4 bg-background shadow-sm min-h-[400px] transition-colors duration-200">

                <input
                    type="text"
                    value={routineName}
                    onChange={e => setRoutineName(e.target.value)}
                    className="mb-6 w-[65%] px-4 py-2 border-0 border-b-2 border-b-primary rounded-none text-2xl font-semibold text-center focus:outline-none bg-background text-secondary placeholder:text-placeholder transition-colors duration-200"
                    placeholder={t("Routine name")}
                />

                <button
                    className="absolute top-3 right-3 flex flex-col items-center"
                    onClick={() => { setShowModal(true); setEditIndex(null); }}
                >
                    <CgAddR className='w-[30px] h-[30px] mr-1'/>    
                    <span className='text-sm text-center font-medium mt-1 whitespace-pre-line'>
                        {t("add section")}
                    </span>
                </button>

                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="sections">
                        {(provided) => (
                            <div className="w-full flex flex-col items-center justify-start mt-5 text-secondary"
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
                                                        className="cursor-grab mt-3 text-icon"
                                                    >
                                                        ⠿
                                                    </div>
                                            
                                                    <SectionItem
                                                        key={index}
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
                                    <p className="text-description">{t("No sections added")}</p>
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div className="w-full flex flex-col items-center justify-start mt-5">

                </div>
            </div>

            {showModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    onClick={handleOverlayClick}
                >
                    <div className="bg-background text-secondary border border-primary/20 rounded-lg shadow-lg p-8 min-w-[350px] max-w-lg w-[93%] relative transition-colors duration-200" onClick={e => e.stopPropagation()}>
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
                            routineSections={routines.flatMap(section => section.routineSections)}
                        />
                    </div>
                </div>
            )}
            <div className="my-2 mb-6 flex flex-col items-center"
                onClick={handleCreate}
            >
                <Button text={t('create')} mode='create' size='big'/>
                <p className="text-center text-error mt-2">{errorMessage}</p>
                <ErrorNotice error={apiError} className="text-center mt-2" />
            </div>

        </div>
    )
}

export default CreateDailyRoutine;
