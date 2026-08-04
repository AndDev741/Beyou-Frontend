import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import IconsBoxSmall from "../inputs/iconsBoxSmall";
import SegmentedControl from "../../ui/SegmentedControl";
import Button from "../Button";
import IconButton from "../../ui/IconButton";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import createTask from "@beyou/api/tasks/createTask";
import editTask from "@beyou/api/tasks/editTask";
import getTasks from "@beyou/api/tasks/getTasks";
import { RootState } from "@beyou/state/rootReducer";
import {
    editCaegoriesIdEnter,
    editDescriptionEnter,
    editDificultyEnter,
    editIconIdEnter,
    editImportanceEnter,
    editModeEnter,
    editNameEnter,
    editOneTimeTaskEnter
} from "@beyou/state/task/editTaskSlice";
import type { task } from "@beyou/types/tasks/taskType";
import type category from "@beyou/types/category/categoryType";
import { taskFormSchema } from "@beyou/validation/forms/taskSchemas";

export type TaskFormMode = "create" | "edit";

type TaskFormProps = {
    mode: TaskFormMode;
    setTasks: React.Dispatch<React.SetStateAction<task[]>>;
    /** O formulário vive num modal: fechar é responsabilidade de quem abriu. */
    onClose?: () => void;
};

/** id do título — o modal aponta o aria-labelledby para ele. */
export const TASK_FORM_TITLE_ID = "task-form-title";

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

function TaskForm({ mode, setTasks, onClose }: TaskFormProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const [search, setSearch] = useState("");

    const taskId = useSelector((state: RootState) => state.editTask.id);
    const nameToEdit = useSelector((state: RootState) => state.editTask.name);
    const descriptionToEdit = useSelector((state: RootState) => state.editTask.description);
    const iconIdToEdit = useSelector((state: RootState) => state.editTask.iconId);
    const importanceToEdit = useSelector((state: RootState) => state.editTask.importance);
    const difficultyToEdit = useSelector((state: RootState) => state.editTask.dificulty);
    const categoriesToEdit = useSelector(
        (state: RootState) => state.editTask.categories || [],
        shallowEqual
    );
    const oneTimeTaskToEdit = useSelector((state: RootState) => state.editTask.oneTimeTask);

    const alreadyChosenCategories: category[] = Array.isArray(categoriesToEdit)
        ? categoriesToEdit
        : Object.entries(categoriesToEdit || {}).map(([id, cat]) => ({ id, name: (cat as any).name, iconId: (cat as any).iconId } as category));

    const editDefaults = useMemo<TaskFormValues>(
        () => ({
            name: nameToEdit || "",
            description: descriptionToEdit || "",
            iconId: iconIdToEdit || "",
            importance: importanceToEdit ?? 0,
            difficulty: difficultyToEdit ?? 0,
            categoriesId: Array.isArray(categoriesToEdit)
                ? categoriesToEdit.map((category) => category.id)
                : Object.keys(categoriesToEdit || {}),
            oneTimeTask: oneTimeTaskToEdit ?? false
        }),
        [
            nameToEdit,
            descriptionToEdit,
            iconIdToEdit,
            importanceToEdit,
            difficultyToEdit,
            categoriesToEdit,
            oneTimeTaskToEdit
        ]
    );

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
        defaultValues: mode === "edit" ? editDefaults : defaultValues
    });

    useEffect(() => {
        if (mode === "edit") {
            reset(editDefaults);
            setSearch(iconIdToEdit || "");
        }
    }, [editDefaults, iconIdToEdit, mode, reset]);

    const handleCancel = () => {
        dispatch(editModeEnter(false));
        dispatch(editNameEnter(""));
        dispatch(editDescriptionEnter(""));
        dispatch(editIconIdEnter(null));
        dispatch(editImportanceEnter(""));
        dispatch(editDificultyEnter(""));
        dispatch(editCaegoriesIdEnter(""));
        dispatch(editOneTimeTaskEnter(false));
        onClose?.();
    };

    const onSubmit = async (values: TaskFormValues) => {
        clearErrors("root");
        setApiError(null);

        const response =
            mode === "edit"
                ? await editTask(
                      taskId,
                      values.name,
                      values.description,
                      values.iconId,
                      values.importance,
                      values.difficulty,
                      values.categoriesId,
                      values.oneTimeTask,
                      t
                  )
                : await createTask(
                      values.name,
                      values.description,
                      values.iconId,
                      values.categoriesId,
                      t,
                      values.importance,
                      values.difficulty,
                      values.oneTimeTask
                  );

        if (response?.success) {
            const newTasks = await getTasks(t);
            if (Array.isArray(newTasks.success)) {
                setTasks(newTasks.success);
            }
            if (mode === "edit") {
                handleCancel();
                toast.success(t("edited successfully"));
            } else {
                reset(defaultValues);
                setSearch("");
                toast.success(t("created successfully"));
                onClose?.();
            }
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

    const fieldClass =
        "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40";
    const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-text-2";

    return (
        <div className="w-full text-text">
            {/* Cabeçalho do modal: título + fechar. */}
            <div className="flex items-center gap-3">
                <h2 id={TASK_FORM_TITLE_ID} className="text-base font-semibold tracking-[-0.01em] text-text">
                    {t(mode === "edit" ? "Edit Task" : "Create Task")}
                </h2>
                {onClose && (
                    <IconButton label={t("Close")} onClick={onClose} className="ml-auto">
                        <X size={18} aria-hidden="true" />
                    </IconButton>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-3.5">
                <div>
                    <label htmlFor="task-name" className={labelClass}>{t("Name")}</label>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <input
                                id="task-name"
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
                    <label htmlFor="task-description" className={labelClass}>{t("Description")}</label>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                            <textarea
                                id="task-description"
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
                                chosenCategories={mode === "edit" ? alreadyChosenCategories : null}
                            />
                        )}
                    />
                </div>

                {/* Tarefa de única conclusão: sai da lista depois de concluída
                    uma vez — o switch do mockup. */}
                <div className="mt-4 flex items-center gap-3">
                    <input
                        id="oneTimeTask"
                        type="checkbox"
                        {...register("oneTimeTask")}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded-control accent-accent"
                    />
                    <div>
                        <label htmlFor="oneTimeTask" className="block text-[12.5px] font-semibold text-text">
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
                    <Button
                        text={t("Cancel")}
                        mode="ghost"
                        size="medium"
                        type="button"
                        onClick={mode === "edit" ? handleCancel : onClose}
                    />
                    <Button
                        text={t("Save task")}
                        mode="primary"
                        size="medium"
                        type="submit"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default TaskForm;
