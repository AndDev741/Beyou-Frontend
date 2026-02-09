import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../Button";
import DescriptionInput from "../inputs/descriptionInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import GenericInput from "../inputs/genericInput";
import IconsBox from "../inputs/iconsBox";
import SelectorInput from "../inputs/SelectorInput";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../services/apiError";
import createGoal from "../../services/goals/createGoal";
import editGoal from "../../services/goals/editGoal";
import getGoals from "../../services/goals/getGoals";
import { enterGoals } from "../../redux/goal/goalsSlice";
import { editModeEnter } from "../../redux/goal/editGoalSlice";
import { RootState } from "../../redux/rootReducer";
import { goalFormSchema } from "../../validation/forms/goalSchemas";

export type GoalFormMode = "create" | "edit";

type GoalFormProps = {
    mode: GoalFormMode;
};

type GoalFormValues = {
    title: string;
    description: string;
    targetValue: number | string;
    unit: string;
    motivation: string;
    currentValue: number | string;
    categoriesId: string[];
    iconId: string;
    startDate: string;
    endDate: string;
    status: string;
    term: string;
};

const defaultValues: GoalFormValues = {
    title: "",
    description: "",
    targetValue: 0,
    unit: "",
    motivation: "",
    currentValue: 0,
    categoriesId: [],
    iconId: "",
    startDate: "",
    endDate: "",
    status: "NOT_STARTED",
    term: "SHORT_TERM"
};

function GoalForm({ mode }: GoalFormProps) {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const [search, setSearch] = useState("");

    const goalId = useSelector((state: RootState) => state.editGoal.goalId);
    const titleEdit = useSelector((state: RootState) => state.editGoal.title);
    const iconId = useSelector((state: RootState) => state.editGoal.iconId);
    const descriptionEdit = useSelector((state: RootState) => state.editGoal.description);
    const targetValueEdit = useSelector((state: RootState) => state.editGoal.targetValue);
    const unitEdit = useSelector((state: RootState) => state.editGoal.unit);
    const currentValueEdit = useSelector((state: RootState) => state.editGoal.currentValue);
    const completeEdit = useSelector((state: RootState) => state.editGoal.complete);
    const categories = useSelector((state: RootState) => state.editGoal.categories);
    const motivationEdit = useSelector((state: RootState) => state.editGoal.motivation);
    const startDateEdit = useSelector((state: RootState) => state.editGoal.startDate);
    const endDateEdit = useSelector((state: RootState) => state.editGoal.endDate);
    const statusEdit = useSelector((state: RootState) => state.editGoal.status);
    const termEdit = useSelector((state: RootState) => state.editGoal.term);

    const editDefaults = useMemo<GoalFormValues>(
        () => ({
            title: titleEdit || "",
            iconId: iconId || "",
            description: descriptionEdit || "",
            targetValue: targetValueEdit ?? 0,
            unit: unitEdit || "",
            currentValue: currentValueEdit ?? 0,
            categoriesId: Object.keys(categories || {}),
            motivation: motivationEdit || "",
            startDate: startDateEdit || "",
            endDate: endDateEdit || "",
            status: statusEdit || "",
            term: termEdit || ""
        }),
        [
            titleEdit,
            iconId,
            descriptionEdit,
            targetValueEdit,
            unitEdit,
            currentValueEdit,
            categories,
            motivationEdit,
            startDateEdit,
            endDateEdit,
            statusEdit,
            termEdit
        ]
    );

    const {
        control,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors }
    } = useForm<GoalFormValues>({
        resolver: zodResolver(goalFormSchema(t)),
        mode: "onBlur",
        defaultValues: mode === "edit" ? editDefaults : defaultValues
    });

    useEffect(() => {
        if (mode === "edit") {
            reset(editDefaults);
            setSearch(iconId || "");
        }
    }, [editDefaults, iconId, mode, reset]);

    const handleCancel = () => {
        dispatch(editModeEnter(false));
    };

    const onSubmit = async (values: GoalFormValues) => {
        clearErrors("root");
        setApiError(null);

        const response =
            mode === "edit"
                ? await editGoal(
                      goalId,
                      values.title,
                      values.iconId,
                      values.description,
                      Number(values.targetValue),
                      values.unit,
                      Number(values.currentValue),
                      completeEdit,
                      values.categoriesId,
                      values.motivation,
                      values.startDate,
                      values.endDate,
                      values.status,
                      values.term,
                      t
                  )
                : await createGoal(
                      values.title,
                      values.iconId,
                      values.description,
                      Number(values.targetValue),
                      values.unit,
                      Number(values.currentValue),
                      values.categoriesId,
                      values.motivation,
                      values.startDate,
                      values.endDate,
                      values.status,
                      values.term,
                      t
                  );

        if (response?.success) {
            const newGoals = await getGoals(t);
            if (Array.isArray(newGoals.success)) {
                dispatch(enterGoals(newGoals.success));
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
        <div className="bg-background text-secondary transition-colors duration-200 rounded-lg p-4 lg:p-6">
            <div className="flex items-center justify-center text-3xl font-semibold">
                <h2>{t(mode === "edit" ? "Edit Goal" : "Create Goal")}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col mt-4">
                <div className="flex md:items-start md:flex-row justify-center">
                    <div className="flex flex-col md:items-start md:justify-start">
                        <Controller
                            control={control}
                            name="title"
                            render={({ field }) => (
                                <GenericInput
                                    name="Title"
                                    placeholder="GoalTitlePlaceholder"
                                    data={field.value}
                                    setData={field.onChange}
                                    dataError={errors.title?.message ?? ""}
                                    t={t}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <DescriptionInput
                                    description={field.value}
                                    setDescription={field.onChange}
                                    placeholder="GoalDescriptionPlaceholder"
                                    descriptionError={errors.description?.message ?? ""}
                                    minH={178}
                                    minHSmallScreen={102}
                                    t={t}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="targetValue"
                            render={({ field }) => (
                                <GenericInput
                                    name="Target Value"
                                    type="number"
                                    placeholder="GoalTargetValuePlaceholder"
                                    data={field.value}
                                    setData={field.onChange}
                                    t={t}
                                    dataError={errors.targetValue?.message ?? ""}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="motivation"
                            render={({ field }) => (
                                <GenericInput
                                    name="Motivation"
                                    placeholder="GoalMotivationPlaceholder"
                                    data={field.value}
                                    setData={field.onChange}
                                    dataError={errors.motivation?.message ?? ""}
                                    t={t}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="startDate"
                            render={({ field }) => (
                                <GenericInput
                                    name="Start Date"
                                    placeholder="GoalStartDatePlaceholder"
                                    t={t}
                                    dataError={errors.startDate?.message ?? ""}
                                    type="date"
                                    data={field.value}
                                    setData={field.onChange}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="status"
                            render={({ field }) => (
                                <SelectorInput
                                    title={t("Status")}
                                    value={field.value}
                                    valuesToSelect={[
                                        { title: t("Not Started"), value: "NOT_STARTED" },
                                        { title: t("In Progress"), value: "IN_PROGRESS" },
                                        { title: t("Completed"), value: "COMPLETED" }
                                    ]}
                                    setValue={field.onChange}
                                    errorPhrase={errors.status?.message ?? ""}
                                    t={t}
                                />
                            )}
                        />
                    </div>

                    <div className="mx-2"></div>

                    <div className="flex flex-col">
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
                                    t={t}
                                    minLgH={272}
                                    minHSmallScreen={200}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="unit"
                            render={({ field }) => (
                                <GenericInput
                                    name="Unit"
                                    placeholder="GoalUnitPlaceholder"
                                    data={field.value}
                                    setData={field.onChange}
                                    dataError={errors.unit?.message ?? ""}
                                    t={t}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="currentValue"
                            render={({ field }) => (
                                <GenericInput
                                    name="Actual Progress"
                                    type="number"
                                    placeholder="Progress"
                                    data={field.value}
                                    setData={field.onChange}
                                    dataError={errors.currentValue?.message ?? ""}
                                    t={t}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="endDate"
                            render={({ field }) => (
                                <GenericInput
                                    name="End Date"
                                    placeholder="End date"
                                    t={t}
                                    dataError={errors.endDate?.message ?? ""}
                                    type="date"
                                    data={field.value}
                                    setData={field.onChange}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="term"
                            render={({ field }) => (
                                <SelectorInput
                                    title={t("Term")}
                                    value={field.value}
                                    setValue={field.onChange}
                                    valuesToSelect={[
                                        { title: t("Short Term"), value: "SHORT_TERM" },
                                        { title: t("Medium Term"), value: "MEDIUM_TERM" },
                                        { title: t("Long Term"), value: "LONG_TERM" }
                                    ]}
                                    t={t}
                                    errorPhrase={errors.term?.message ?? ""}
                                />
                            )}
                        />
                    </div>
                </div>

                <Controller
                    control={control}
                    name="categoriesId"
                    render={({ field }) => (
                        <ChooseCategories
                            categoriesIdList={field.value}
                            setCategoriesIdList={field.onChange}
                            errorMessage={errors.categoriesId?.message ?? ""}
                            chosenCategories={null}
                            chosenCategoriesId={mode === "edit" ? field.value : undefined}
                        />
                    )}
                />

                {errors.root?.message && (
                    <p className="text-error text-center mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center mt-2" />
                {mode === "edit" ? (
                    <div className="flex items-center justify-evenly mt-4">
                        <Button text={t("Cancel")} mode="cancel" type="button" size="medium" onClick={handleCancel} />
                        <Button text={t("Edit")} mode="create" size="medium" />
                    </div>
                ) : (
                    <div className="flex justify-center mt-4">
                        <Button text={t("Create")} mode="create" size="big" />
                    </div>
                )}
            </form>
        </div>
    );
}

export default GoalForm;
