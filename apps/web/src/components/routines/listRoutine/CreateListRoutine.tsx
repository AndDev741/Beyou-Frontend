import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import type { Routine, RoutineListItem } from "@beyou/types/routine/routine";
import createRoutine from "@beyou/api/routine/createRoutine";
import getRoutines from "@beyou/api/routine/getRoutines";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import { routineListFormSchema } from "@beyou/validation/forms/routineSchemas";
import Button from "../../Button";
import ErrorNotice from "../../ErrorNotice";
import Modal from "../../modals/Modal";
import RoutineTypeField from "../dailyRoutine/RoutineTypeField";
import ListItemsEditor from "./ListItemsEditor";
import ListItemPicker from "./ListItemPicker";

type CreateListRoutineProps = {
    routineType: string;
    setRoutineType: (value: string) => void;
    onCancel?: () => void;
    onCreated?: () => void;
};

/**
 * The LIST routine form: a name and an ordered pile of habits and tasks.
 *
 * Shaped after CreateDailyRoutine so the two read the same way, minus everything to do with
 * time — no section modal, no start and end fields, no slot suggestion.
 */
export default function CreateListRoutine({
    routineType,
    setRoutineType,
    onCancel,
    onCreated,
}: CreateListRoutineProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [items, setItems] = useState<RoutineListItem[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        setError,
        clearErrors,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<{ routineName: string; items: RoutineListItem[] }>({
        resolver: zodResolver(routineListFormSchema(t)),
        mode: "onBlur",
        defaultValues: { routineName: "", items: [] },
    });

    useEffect(() => {
        // Same restraint the daily form uses: an empty form should not greet the user with
        // "at least one item" before they have had a chance to add one.
        setValue("items", items, { shouldValidate: isSubmitted });
    }, [items, setValue, isSubmitted]);

    const addPicked = (picked: Array<{ type: "HABIT" | "TASK"; refId: string }>) => {
        setItems((prev) => [
            ...prev,
            ...picked.map((entry, offset) => ({
                id: "",
                type: entry.type,
                habitId: entry.type === "HABIT" ? entry.refId : null,
                taskId: entry.type === "TASK" ? entry.refId : null,
                orderIndex: prev.length + offset,
            })),
        ]);
    };

    const onSubmit = async (values: { routineName: string; items: RoutineListItem[] }) => {
        clearErrors("root");
        setApiError(null);

        const routine: Routine = {
            name: values.routineName,
            type: "LIST",
            iconId: "",
            // A list has no sections of its own; the server builds the one it stores them in.
            routineSections: [],
            items: values.items.map((item, index) => ({ ...item, orderIndex: index })),
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
        setItems([]);
        reset({ routineName: "", items: [] });
        toast.success(t("created successfully"));
        onCreated?.();
    };

    return (
        <div data-tutorial-id="routine-list-form">
            <RoutineTypeField value={routineType} onChange={setRoutineType} />

            <div className="mt-4">
                <label
                    htmlFor="create-list-routine-name"
                    className="mb-1.5 block text-[12.5px] font-semibold text-text-2"
                >
                    {t("Name")}
                </label>
                <Controller
                    control={control}
                    name="routineName"
                    render={({ field }) => (
                        <input
                            id="create-list-routine-name"
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
                <ListItemsEditor items={items} setItems={setItems} onAddItem={() => setPickerOpen(true)} />
                {errors.items?.message && <p className="mt-1.5 text-xs text-danger">{errors.items.message}</p>}
            </div>

            {errors.root?.message && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
            <ErrorNotice error={apiError} className="mt-2" />

            <div className="mt-[18px] flex justify-end gap-2">
                {onCancel && <Button text={t("Cancel")} mode="ghost" size="medium" onClick={onCancel} />}
                <Button
                    text={t("Save routine")}
                    mode="primary"
                    size="medium"
                    type="submit"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onSubmit)}
                />
            </div>

            <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} labelledBy="list-item-picker-title">
                <ListItemPicker items={items} onAdd={addPicked} onClose={() => setPickerOpen(false)} />
            </Modal>
        </div>
    );
}
