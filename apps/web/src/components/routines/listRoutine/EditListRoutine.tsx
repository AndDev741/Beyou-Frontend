import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import type { Routine, RoutineListItem } from "@beyou/types/routine/routine";
import editRoutine from "@beyou/api/routine/editRoutine";
import getRoutines from "@beyou/api/routine/getRoutines";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import { editModeEnter } from "@beyou/state/routine/editRoutineSlice";
import { getListItems } from "@beyou/state";
import { RootState } from "@beyou/state/rootReducer";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import { routineListFormSchema } from "@beyou/validation/forms/routineSchemas";
import Button from "../../Button";
import ErrorNotice from "../../ErrorNotice";
import Modal from "../../modals/Modal";
import ListItemsEditor from "./ListItemsEditor";
import ListItemPicker from "./ListItemPicker";

/**
 * Editing a LIST routine.
 *
 * The one thing to be careful about here is the item id. Every entry that already exists
 * carries the id of its item group, and echoing it back is what keeps the row — and with it
 * every day the user ever ticked that item. An edit that dropped the ids would look
 * identical on screen and quietly erase the history behind it.
 */
export default function EditListRoutine() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const routine = useSelector((state: RootState) => state.editRoutine.routine) as Routine | undefined;

    const [items, setItems] = useState<RoutineListItem[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);

    const {
        control,
        handleSubmit,
        setValue,
        setError,
        clearErrors,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<{ routineName: string; items: RoutineListItem[] }>({
        resolver: zodResolver(routineListFormSchema(t)),
        mode: "onBlur",
        defaultValues: { routineName: routine?.name ?? "", items: [] },
    });

    useEffect(() => {
        if (!routine) return;
        setValue("routineName", routine.name);
        setItems(getListItems(routine));
    }, [routine, setValue]);

    useEffect(() => {
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

    const close = () => dispatch(editModeEnter(false));

    const onSubmit = async (values: { routineName: string; items: RoutineListItem[] }) => {
        if (!routine?.id) return;
        clearErrors("root");
        setApiError(null);

        const payload: Routine = {
            id: routine.id,
            name: values.routineName,
            type: "LIST",
            iconId: routine.iconId ?? "",
            routineSections: [],
            items: values.items.map((item, index) => ({ ...item, orderIndex: index })),
        };

        const response = await editRoutine(payload, t);
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
        toast.success(t("edited successfully"));
        close();
    };

    if (!routine) return null;

    return (
        <div>
            <div className="mt-1">
                <label
                    htmlFor="edit-list-routine-name"
                    className="mb-1.5 block text-[12.5px] font-semibold text-text-2"
                >
                    {t("Name")}
                </label>
                <Controller
                    control={control}
                    name="routineName"
                    render={({ field }) => (
                        <input
                            id="edit-list-routine-name"
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
                <Button text={t("Cancel")} mode="ghost" size="medium" onClick={close} />
                <Button
                    text={t("Save")}
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
