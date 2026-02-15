import { useEffect, useState } from "react";
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
import ErrorNotice from "../../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../../services/apiError";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routineFormSchema } from "../../../validation/forms/routineSchemas";

const CreateDailyRoutine = ({
    onSectionChange,
    onSectionModalChange
}: {
    onSectionChange?: (hasSection: boolean) => void;
    onSectionModalChange?: (isOpen: boolean) => void;
}) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [routineSection, setRoutineSection] = useState<RoutineSection[]>([]);
    const [showModal, setShowModal] = useState(false);
    const routines = useSelector((state: RootState) => state.routines.routines) || [];

    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        setError,
        clearErrors,
        formState: { errors }
    } = useForm<{ routineName: string; routineSections: RoutineSection[] }>({
        resolver: zodResolver(routineFormSchema(t)),
        mode: "onBlur",
        defaultValues: {
            routineName: "",
            routineSections: []
        }
    });

    useEffect(() => {
        setValue("routineSections", routineSection, { shouldValidate: true });
    }, [routineSection, setValue]);

    useEffect(() => {
        onSectionChange?.(routineSection.length > 0);
        return () => {
            onSectionChange?.(false);
        };
    }, [routineSection, onSectionChange]);

    useEffect(() => {
        onSectionModalChange?.(showModal);
        return () => {
            onSectionModalChange?.(false);
        };
    }, [showModal, onSectionModalChange]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setShowModal(false);
            setEditIndex(null);
        }
    };

    const handleDeleteSection = (index: number) => {
        setRoutineSection((prev) => prev.filter((_, i) => i !== index));
    };

    const handleEditSection = (index: number) => {
        setEditIndex(index);
        setShowModal(true);
    };

    const handleUpdateSection = (updatedSection: RoutineSection) => {
        if (editIndex !== null) {
            setRoutineSection((prev) =>
                prev.map((section, idx) => (idx === editIndex ? updatedSection : section))
            );
            setEditIndex(null);
            setShowModal(false);
        }
    };

    const onSubmit = async (values: { routineName: string; routineSections: RoutineSection[] }) => {
        clearErrors("root");
        setApiError(null);

        const routine: Routine = {
            name: values.routineName,
            type: "DAILY",
            iconId: "",
            routineSections: values.routineSections.map((section) => ({
                ...section,
                id: section.id ?? ""
            }))
        };

        const response = await createRoutine(routine, t);

        const error = response?.error || response?.validation;
        if (error) {
            if (typeof error === "string") {
                setError("root", { message: error });
                toast.error(error);
            } else {
                setApiError(error);
                toast.error(getFriendlyErrorMessage(t, error));
            }
            return;
        }

        const routinesResponse = await getRoutines(t);
        dispatch(enterRoutines(routinesResponse?.success));
        setRoutineSection([]);
        reset({ routineName: "", routineSections: [] });
        toast.success(t("created successfully"));
    };

    const handleOnDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(routineSection);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setRoutineSection(items);
    };

    return (
        <div
            className="w-full flex flex-col items-center justify-center text-secondary overflow-x-hidden"
            data-tutorial-id="routine-daily-form"
        >
            <h2 className="text-2xl text-secondary">{t("Creating daily routine")}</h2>

            <div className="relative w-full md:w-[95%] max-w-full flex flex-col items-center justify-start border-2 border-primary rounded-lg p-3 mt-4 bg-background shadow-sm min-h-[400px] transition-colors duration-200">
                <Controller
                    control={control}
                    name="routineName"
                    render={({ field }) => (
                        <input
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            className="mb-6 w-[65%] px-4 py-2 border-0 border-b-2 border-b-primary rounded-none text-2xl font-semibold text-center focus:outline-none bg-background text-secondary placeholder:text-placeholder transition-colors duration-200"
                            placeholder={t("Routine name")}
                        />
                    )}
                />
                {errors.routineName?.message && (
                    <p className="text-error text-center mt-2">{errors.routineName?.message}</p>
                )}

                <button
                    className="absolute top-3 right-3 flex flex-col items-center"
                    data-tutorial-id="routine-add-section"
                    onClick={() => {
                        setShowModal(true);
                        setEditIndex(null);
                    }}
                    type="button"
                >
                    <CgAddR className="w-[30px] h-[30px] mr-1" />
                    <span className="text-sm text-center font-medium mt-1 whitespace-pre-line">
                        {t("add section")}
                    </span>
                </button>

                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="sections">
                        {(provided) => (
                            <div
                                className="w-full flex flex-col items-stretch justify-start mt-5 text-secondary"
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
                                                    className="flex items-start w-full min-w-0"
                                                    data-tutorial-id={index === 0 ? "routine-section-item" : undefined}
                                                >
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
                                    <p className="text-description text-center">{t("No sections added")}</p>
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
                    <div
                        className="bg-background text-secondary border border-primary/20 rounded-lg shadow-lg p-5 md:p-8 min-w-[350px] max-w-lg w-[99%] relative transition-colors duration-200"
                        data-tutorial-id="routine-section-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <CreateRoutineSection
                            setRoutineSection={
                                editIndex === null
                                    ? setRoutineSection
                                    : (updatedSections) => {
                                          if (updatedSections.length > routineSection.length) {
                                              setRoutineSection(updatedSections);
                                          } else if (editIndex !== null) {
                                              handleUpdateSection(updatedSections[editIndex]);
                                          }
                                      }
                            }
                            onClose={() => {
                                setShowModal(false);
                                setEditIndex(null);
                            }}
                            onUpdateSection={handleUpdateSection}
                            editIndex={editIndex}
                            editSection={editIndex !== null ? routineSection[editIndex] : undefined}
                            routineSections={routines.flatMap((section) => section.routineSections)}
                        />
                    </div>
                </div>
            )}
            <div className="my-2 mb-6 flex flex-col items-center">
                <Button text={t("create")} mode="create" size="big" onClick={handleSubmit(onSubmit)} type="submit" />
                {errors.routineSections?.message && (
                    <p className="text-center text-error mt-2">{errors.routineSections?.message}</p>
                )}
                {errors.root?.message && (
                    <p className="text-center text-error mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center mt-2" />
            </div>
        </div>
    );
};

export default CreateDailyRoutine;
