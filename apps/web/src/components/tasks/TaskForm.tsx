import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import IconsBox from "../inputs/iconsBox";
import DescriptionInput from "../inputs/descriptionInput";
import GenericInput from "../inputs/genericInput";
import ChooseInput from "../inputs/chooseInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
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

    return (
        <div className="w-full text-text">
            {/* Cabeçalho do modal: título + fechar. */}
            <div className="mb-4 flex items-start justify-between gap-3">
                <h2 id={TASK_FORM_TITLE_ID} className="text-lg font-semibold tracking-[-0.01em] text-text">
                    {t(mode === "edit" ? "Edit Task" : "Create Task")}
                </h2>
                {onClose && (
                    <IconButton label={t("Close")} onClick={onClose} className="-mr-1 -mt-1">
                        <X size={18} aria-hidden="true" />
                    </IconButton>
                )}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center">
                <div className="flex md:items-start md:flex-row justify-center">
                    <div className="flex flex-col md:items-start md:justify-start">
                        <Controller
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <GenericInput
                                    name="Name"
                                    data={field.value}
                                    placeholder="Clean the house"
                                    setData={field.onChange}
                                    dataError={errors.name?.message ?? ""}
                                    t={t}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <DescriptionInput
                                    t={t}
                                    description={field.value}
                                    setDescription={field.onChange}
                                    descriptionError={errors.description?.message ?? ""}
                                    placeholder="Important to keep things organized"
                                    minH={mode === "edit" ? 134 : 99}
                                />
                            )}
                        />
                    </div>

                    <div className="mx-2"></div>

                    <div className="flex flex-col md:flex-col md:mt-0">
                        <Controller
                            control={control}
                            name="iconId"
                            render={({ field }) => (
                                <IconsBox
                                    search={search}
                                    setSearch={setSearch}
                                    iconError={errors.iconId?.message ?? ""}
                                    selectedIcon={field.value}
                                    setSelectedIcon={field.onChange}
                                    minLgH={mode === "edit" ? 194 : 158}
                                    minHSmallScreen={mode === "edit" ? 192 : undefined}
                                    t={t}
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center md:gap-10 w-full md:w-[80%]">
                    <Controller
                        control={control}
                        name="importance"
                        render={({ field }) => (
                            <ChooseInput
                                choosedLevel={field.value}
                                setLevel={field.onChange}
                                title="Importance"
                                levels={[t("Low"), t("Medium"), t("High"), t("Max")]}
                                error={errors.importance?.message ?? ""}
                                name="importance"
                                t={t}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="difficulty"
                        render={({ field }) => (
                            <ChooseInput
                                choosedLevel={field.value}
                                error={errors.difficulty?.message ?? ""}
                                setLevel={field.onChange}
                                title="Difficulty"
                                levels={[t("Easy"), t("Normal"), t("Hard"), t("Terrible")]}
                                name="difficulty"
                                t={t}
                            />
                        )}
                    />
                </div>

                <div>
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
                    <div className="mt-3 flex items-center justify-center">
                        <input
                            id="oneTimeTask"
                            type="checkbox"
                            {...register("oneTimeTask")}
                            className="h-5 w-5 cursor-pointer rounded-control border border-border bg-surface accent-accent transition-colors duration-200"
                        />
                        <label htmlFor="oneTimeTask" className="ml-2 text-sm text-text">
                            {t(mode === "edit" ? "One-time Task" : "One Time Task")}
                        </label>
                    </div>
                </div>

                {errors.root?.message && (
                    <p className="text-danger text-center mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center" />

                {/* Rodapé do modal: cancelar à esquerda, ação primária à direita. */}
                <div className="mt-6 flex w-full items-center justify-end gap-3 border-t border-border pt-4">
                    {(mode === "edit" || onClose) && (
                        <Button
                            text={t("Cancel")}
                            mode="cancel"
                            size="medium"
                            type="button"
                            onClick={mode === "edit" ? handleCancel : onClose}
                        />
                    )}
                    <Button
                        text={t(mode === "edit" ? "Edit" : "Create")}
                        mode="create"
                        size="medium"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default TaskForm;
