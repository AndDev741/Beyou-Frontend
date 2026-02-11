import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CreateRoutineSection from "./CreateRoutineSection";
import { RoutineSection } from "../../../types/routine/routineSection";
import SectionItem from "./SectionItem";
import { Routine } from "../../../types/routine/routine";
import { useDispatch, useSelector } from "react-redux";
import { enterRoutines } from "../../../redux/routine/routinesSlice";
import getRoutines from "../../../services/routine/getRoutines";
import { RootState } from "../../../redux/rootReducer";
import { editModeEnter } from "../../../redux/routine/editRoutineSlice";
import editRoutine from "../../../services/routine/editRoutine";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import Droppable from "../../../components/utils/StrictModeDroppable";
import { CgAddR } from "react-icons/cg";
import Button from "../../Button";
import { toast } from "react-toastify";
import ErrorNotice from "../../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../../services/apiError";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routineFormSchema } from "../../../validation/forms/routineSchemas";

const EditDailyRoutine = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const routines = useSelector((state: RootState) => state.routines.routines) || [];
    const routineToEdit = useSelector((state: RootState) => state.editRoutine.routine);

    const [routineSection, setRoutineSection] = useState<RoutineSection[]>([]);
    const [showModal, setShowModal] = useState(false);
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
        if (routineToEdit) {
            reset({
                routineName: routineToEdit.name,
                routineSections: routineToEdit.routineSections
            });
            setRoutineSection(routineToEdit.routineSections);
        }
    }, [routineToEdit, reset]);

    useEffect(() => {
        setValue("routineSections", routineSection, { shouldValidate: true });
    }, [routineSection, setValue]);

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
        if (!routineToEdit?.id) {
            setError("root", { message: t("UnexpectedError") });
            return;
        }

        const routine: Routine = {
            id: routineToEdit.id,
            name: values.routineName,
            iconId: "",
            routineSections: values.routineSections
        };

        const response = await editRoutine(routine, t);

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
        dispatch(editModeEnter(false));
        toast.success(t("edited successfully"));
    };

    const handleOnDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(routineSection);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setRoutineSection(items);
    };

    return (
        <div className="w-full flex flex-col items-center justify-center text-secondary">
            <h2 className="text-2xl text-secondary">{t("Editing daily routine")}</h2>

            <div className="relative md:w-[95%] flex flex-col items-center justify-start border-2 border-primary rounded-lg p-3 mt-4 bg-background shadow-sm min-h-[400px] transition-colors duration-200">
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
                    onClick={() => {
                        setShowModal(true);
                        setEditIndex(null);
                    }}
                    type="button"
                >
                    <CgAddR className="w-[30px] h-[30px] mr-1" />
                    <span className="text-sm text-center font-medium mt-1 whitespace-pre-line text-secondary">
                        {t("add section")}
                    </span>
                </button>

                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="sections">
                        {(provided) => (
                            <div
                                className="w-full flex flex-col items-center justify-start mt-5 text-secondary"
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
                                                    className="flex items-start w-full"
                                                >
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="cursor-grab mt-3 text-icon"
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
                                    <p className="text-description">{t("No sections added")}</p>
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
                        className="bg-background text-secondary border border-primary/20 rounded-lg shadow-lg p-8 min-w-[350px] max-w-lg w-[93%] relative transition-colors duration-200"
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
                <div className="w-full flex mt-2">
                    <Button
                        text={t("Cancel")}
                        mode="cancel"
                        size="medium"
                        onClick={() => dispatch(editModeEnter(false))}
                    />

                    <div className="mx-3"></div>

                    <Button text={t("Edit")} mode="create" size="medium" onClick={handleSubmit(onSubmit)} type="submit" />
                </div>
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

export default EditDailyRoutine;
