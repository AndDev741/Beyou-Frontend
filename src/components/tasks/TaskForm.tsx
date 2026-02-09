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
import { CgAddR } from "react-icons/cg";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../services/apiError";
import createTask from "../../services/tasks/createTask";
import editTask from "../../services/tasks/editTask";
import getTasks from "../../services/tasks/getTasks";
import { RootState } from "../../redux/rootReducer";
import {
    editCaegoriesIdEnter,
    editDescriptionEnter,
    editDificultyEnter,
    editIconIdEnter,
    editImportanceEnter,
    editModeEnter,
    editNameEnter,
    editOneTimeTaskEnter
} from "../../redux/task/editTaskSlice";
import type { task } from "../../types/tasks/taskType";
import type category from "../../types/category/categoryType";
import { taskFormSchema } from "../../validation/forms/taskSchemas";

export type TaskFormMode = "create" | "edit";

type TaskFormProps = {
    mode: TaskFormMode;
    setTasks: React.Dispatch<React.SetStateAction<task[]>>;
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

function TaskForm({ mode, setTasks }: TaskFormProps) {
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

    const alreadyChosenCategories: category[] = categoriesToEdit || [];

    const editDefaults = useMemo<TaskFormValues>(
        () => ({
            name: nameToEdit || "",
            description: descriptionToEdit || "",
            iconId: iconIdToEdit || "",
            importance: importanceToEdit ?? 0,
            difficulty: difficultyToEdit ?? 0,
            categoriesId: (categoriesToEdit || []).map((category) => category.id),
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
        formState: { errors }
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
        <div className="w-full bg-background text-secondary">
            <div className="flex items-center justify-center mt-5 mb-3 text-3xl">
                <CgAddR className="w-[40px] h-[40px] mr-1" />
                <h1>{t(mode === "edit" ? "Edit Task" : "Create Task")}</h1>
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
                                    minH={mode === "edit" ? 100 : 0}
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

                <div className="flex flex-col md:flex-row items-center justify-center w-full md:w-[80%]">
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
                    <div className="flex items-center justify-center mt-2">
                        <input
                            id="oneTimeTask"
                            type="checkbox"
                            {...register("oneTimeTask")}
                            className="accent-primary border border-primary w-8 h-8 rounded-xl cursor-pointer bg-background transition-colors duration-200"
                        />
                        <label htmlFor="oneTimeTask" className="ml-2 text-xl text-secondary">
                            {t(mode === "edit" ? "One-time Task" : "One Time Task")}
                        </label>
                    </div>
                </div>

                {errors.root?.message && (
                    <p className="text-error text-center mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center" />

                {mode === "edit" ? (
                    <div className="flex w-full items-center justify-evenly mt-6">
                        <Button text={t("Cancel")} mode="cancel" size="medium" type="button" onClick={handleCancel} />
                        <Button text={t("Edit")} mode="create" size="medium" />
                    </div>
                ) : (
                    <div className="mb-3 mt-3">
                        <Button text={t("Create")} mode="create" size="big" />
                    </div>
                )}
            </form>
        </div>
    );
}

export default TaskForm;
