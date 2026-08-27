import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CreateRoutineSection from "./CreateRoutineSection";
import SectionsEditor from "./SectionsEditor";
import RoutineTypeField from "./RoutineTypeField";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { Routine } from "@beyou/types/routine/routine";
import { useDispatch, useSelector } from "react-redux";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import getRoutines from "@beyou/api/routine/getRoutines";
import { RootState } from "@beyou/state/rootReducer";
import { editModeEnter } from "@beyou/state/routine/editRoutineSlice";
import editRoutine from "@beyou/api/routine/editRoutine";
import Button from "../../Button";
import { toast } from "react-toastify";
import ErrorNotice from "../../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routineFormSchema } from "@beyou/validation/forms/routineSchemas";

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
        formState: { errors, isSubmitting, isSubmitted }
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
        // Only revalidates after the first save attempt: opening an empty form
        // should not be met with "at least 1 section" right away.
        setValue("routineSections", routineSection, { shouldValidate: isSubmitted });
    }, [routineSection, setValue, isSubmitted]);

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
            // The web has no field for the routine's own icon, but the agent and the
            // mobile builder set one. Sending "" here erased it on every save, so an
            // agent-made routine lost its icon the first time it was edited.
            iconId: routineToEdit.iconId ?? "",
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

    return (
        <div>
            {/* Fixed once the routine exists: the backend refuses a type change, because
                    switching would either discard every time window or invent times nobody set. */}
                <RoutineTypeField value="daily" onChange={() => {}} disabled />

            <div className="mt-4">
                <label htmlFor="edit-routine-name" className="mb-1.5 block text-[12.5px] font-semibold text-text-2">
                    {t("Name")}
                </label>
                <Controller
                    control={control}
                    name="routineName"
                    render={({ field }) => (
                        <input
                            id="edit-routine-name"
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("Routine name")}
                            className={`w-full rounded-control border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                                errors.routineName ? "border-danger" : "border-border"
                            }`}
                        />
                    )}
                />
                {errors.routineName?.message && (
                    <p className="mt-1.5 text-xs text-danger">{errors.routineName.message}</p>
                )}
            </div>

            <div className="mt-4">
                <SectionsEditor
                    sections={routineSection}
                    setRoutineSection={setRoutineSection}
                    onEditSection={handleEditSection}
                    onDeleteSection={handleDeleteSection}
                    onAddSection={() => {
                        setShowModal(true);
                        setEditIndex(null);
                    }}
                />
                {errors.routineSections?.message && (
                    <p className="mt-1.5 text-xs text-danger">{errors.routineSections.message}</p>
                )}
            </div>

            {errors.root?.message && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
            <ErrorNotice error={apiError} className="mt-2" />

            <div className="mt-[18px] flex justify-end gap-2">
                <Button
                    text={t("Cancel")}
                    mode="ghost"
                    size="medium"
                    onClick={() => dispatch(editModeEnter(false))}
                />
                <Button
                    text={t("Save routine")}
                    mode="primary"
                    size="medium"
                    type="submit"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onSubmit)}
                />
            </div>

            {showModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
                    onClick={handleOverlayClick}
                >
                    <div
                        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-5 text-text shadow-surface md:p-7"
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
        </div>
    );
};

export default EditDailyRoutine;
