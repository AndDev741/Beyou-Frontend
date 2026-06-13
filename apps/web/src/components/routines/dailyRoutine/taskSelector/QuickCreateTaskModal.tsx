import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "../../../modals/Modal";
import GenericInput from "../../../inputs/genericInput";
import DescriptionInput from "../../../inputs/descriptionInput";
import IconsBoxSmall from "../../../inputs/iconsBoxSmall";
import ChooseInput from "../../../inputs/chooseInput";
import ChooseCategories from "../../../inputs/chooseCategory/chooseCategories";
import Button from "../../../Button";
import ErrorNotice from "../../../ErrorNotice";
import createTask from "../../../../services/tasks/createTask";
import getTasks from "../../../../services/tasks/getTasks";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../../../services/apiError";
import { enterTasks } from "../../../../redux/task/tasksSlice";
import { taskFormSchema } from "../../../../validation/forms/taskSchemas";
import type { task } from "../../../../types/tasks/taskType";

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
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors }
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

    return (
        <Modal isOpen={isOpen} onClose={closeAndReset}>
            <h2 className="text-2xl font-semibold text-center mb-2">{t("QuickCreateTaskTitle")}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center">
                <div className="flex md:items-start md:flex-row justify-center w-full">
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
                                    minH={120}
                                    minHSmallScreen={120}
                                />
                            )}
                        />
                    </div>

                    <div className="mx-2"></div>

                    <div className="flex flex-col mt-2 md:mt-0">
                        <Controller
                            control={control}
                            name="iconId"
                            render={({ field }) => (
                                <IconsBoxSmall
                                    search={search}
                                    setSearch={setSearch}
                                    iconError={errors.iconId?.message ?? ""}
                                    selectedIcon={field.value}
                                    setSelectedIcon={field.onChange}
                                    t={t}
                                    minLgH={140}
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
                            />
                        )}
                    />
                </div>

                {errors.root?.message && (
                    <p className="text-error text-center mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center" />

                <div className="flex w-full items-center justify-evenly mt-2">
                    <Button text={t("Cancel")} mode="cancel" size="medium" type="button" onClick={closeAndReset} />
                    <Button text={t("Create")} mode="create" size="medium" type="submit" />
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
