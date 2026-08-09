import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "../../../modals/Modal";
import IconsBoxSmall from "../../../inputs/iconsBoxSmall";
import SegmentedControl from "../../../../ui/SegmentedControl";
import { FiX } from "react-icons/fi";
import ChooseCategories from "../../../inputs/chooseCategory/chooseCategories";
import Button from "../../../Button";
import ErrorNotice from "../../../ErrorNotice";
import createTask from "@beyou/api/tasks/createTask";
import getTasks from "@beyou/api/tasks/getTasks";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import { taskFormSchema } from "@beyou/validation/forms/taskSchemas";
import type { task } from "@beyou/types/tasks/taskType";

type QuickCreateTaskModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (taskId?: string) => void;
};

type TaskFormValues = {
    name: string;
    description: string;
    iconId: string;
    importance: number;
    difficulty: number;
    categoriesId: string[];
    oneTimeTask: boolean;
};

const defaultValues: TaskFormValues = {
    name: "",
    description: "",
    iconId: "",
    importance: 0,
    difficulty: 0,
    categoriesId: [],
    oneTimeTask: false
};

function QuickCreateTaskModal({ isOpen, onClose, onCreated }: QuickCreateTaskModalProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const [search, setSearch] = useState("");

    const {
        control,
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors, isSubmitting }
    } = useForm<TaskFormValues>({
        resolver: zodResolver(taskFormSchema(t)),
        mode: "onBlur",
        defaultValues
    });

    const closeAndReset = () => {
        reset(defaultValues);
        setSearch("");
        setApiError(null);
        onClose();
    };

    const onSubmit = async (values: TaskFormValues) => {
        clearErrors("root");
        setApiError(null);

        const response = await createTask(
            values.name,
            values.description,
            values.iconId,
            values.categoriesId,
            t,
            values.importance,
            values.difficulty,
            false
        );

        if (response?.success) {
            const newTasks = await getTasks(t);
            if (Array.isArray(newTasks.success)) {
                dispatch(enterTasks(newTasks.success));
                const match = findCreatedTask(newTasks.success, values);
                onCreated?.(match?.id);
            }
            toast.success(t("created successfully"));
            closeAndReset();
            return;
        }

        if (response?.error) {
            setApiError(response.error);
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }

        if (response?.validation) {
            setError("root", { message: response.validation });
            toast.error(response.validation);
        }
    };

    const controlClass =
        "rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40";
    const fieldClass = `w-full ${controlClass}`;
    const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-text-2";

    return (
        <Modal isOpen={isOpen} onClose={closeAndReset} className="max-w-xl">
            <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold tracking-[-0.01em] text-text">
                    {t("QuickCreateTaskTitle")}
                </h2>
                <button
                    type="button"
                    aria-label={t("Close")}
                    onClick={closeAndReset}
                    className="ml-auto rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                >
                    <FiX />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-3.5 text-text">
                <div>
                    <label htmlFor="quick-task-name" className={labelClass}>{t("Name")}</label>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <input
                                id="quick-task-name"
                                type="text"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder={t("TaskNamePlaceholder")}
                                className={`${fieldClass} ${errors.name ? "border-danger" : ""}`}
                            />
                        )}
                    />
                    {errors.name?.message && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
                </div>

                <div className="mt-4">
                    <label htmlFor="quick-task-description" className={labelClass}>{t("Description")}</label>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                            <textarea
                                id="quick-task-description"
                                rows={3}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder={t("TaskDescriptionPlaceholder")}
                                className={`${fieldClass} resize-none`}
                            />
                        )}
                    />
                </div>

                <div className="mt-4">
                    <Controller
                        control={control}
                        name="iconId"
                        render={({ field }) => (
                            <IconsBoxSmall
                                search={search}
                                setSearch={setSearch}
                                t={t}
                                iconError={errors.iconId?.message ?? ""}
                                setSelectedIcon={field.onChange}
                                selectedIcon={field.value || ""}
                            />
                        )}
                    />
                </div>

                <div className="mt-4">
                    <span className={labelClass}>{t("Importance")}</span>
                    <Controller
                        control={control}
                        name="importance"
                        render={({ field }) => (
                            <SegmentedControl
                                className="w-full"
                                label={t("Importance")}
                                value={field.value}
                                onChange={field.onChange}
                                options={[
                                    { value: 1, label: t("Low") },
                                    { value: 2, label: t("Medium") },
                                    { value: 3, label: t("High") },
                                    { value: 4, label: t("Max") },
                                ]}
                            />
                        )}
                    />
                </div>

                <div className="mt-4">
                    <span className={labelClass}>{t("Difficulty")}</span>
                    <Controller
                        control={control}
                        name="difficulty"
                        render={({ field }) => (
                            <SegmentedControl
                                className="w-full"
                                label={t("Difficulty")}
                                value={field.value}
                                onChange={field.onChange}
                                options={[
                                    { value: 1, label: t("Easy") },
                                    { value: 2, label: t("Normal") },
                                    { value: 3, label: t("Hard") },
                                    { value: 4, label: t("Terrible") },
                                ]}
                            />
                        )}
                    />
                </div>

                <div className="mt-4">
                    <span className={labelClass}>{t("Categories")}</span>
                    <Controller
                        control={control}
                        name="categoriesId"
                        render={({ field }) => (
                            <ChooseCategories
                                categoriesIdList={field.value}
                                setCategoriesIdList={field.onChange}
                                errorMessage={errors.categoriesId?.message ?? ""}
                            />
                        )}
                    />
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <input
                        id="quick-task-one-time"
                        type="checkbox"
                        {...register("oneTimeTask")}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded-control accent-accent"
                    />
                    <div>
                        <label htmlFor="quick-task-one-time" className="block text-[12.5px] font-semibold text-text">
                            {t("OneTimeTaskLabel")}
                        </label>
                        <span className="mt-0.5 block font-mono text-[10.5px] text-text-3">
                            {t("OneTimeTaskCaption")}
                        </span>
                    </div>
                </div>

                {errors.root?.message && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
                <ErrorNotice error={apiError} className="mt-2" />

                <div className="mt-[18px] flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={closeAndReset} />
                    {/* Same double-submit guard the main forms carry: without it a second
                        click creates a twin, and the create-then-find-by-name lookup
                        adds that twin to the section. */}
                    <Button
                        text={t("Save task")}
                        mode="primary"
                        size="medium"
                        type="submit"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </Modal>
    );
}

const findCreatedTask = (tasks: task[], values: TaskFormValues) => {
    const exact = tasks.filter((item) => item.name === values.name && item.iconId === values.iconId);
    if (exact.length > 0) return exact[exact.length - 1];
    const byName = tasks.filter((item) => item.name === values.name);
    if (byName.length > 0) return byName[byName.length - 1];
    return undefined;
};

export default QuickCreateTaskModal;
