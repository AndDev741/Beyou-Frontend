import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../Button";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import IconsBoxSmall from "../inputs/iconsBoxSmall";
import SegmentedControl from "../../ui/SegmentedControl";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import createGoal from "@beyou/api/goals/createGoal";
import editGoal from "@beyou/api/goals/editGoal";
import getGoals from "@beyou/api/goals/getGoals";
import { enterGoals } from "@beyou/state/goal/goalsSlice";
import { editModeEnter } from "@beyou/state/goal/editGoalSlice";
import { RootState } from "@beyou/state/rootReducer";
import { goalFormSchema } from "@beyou/validation/forms/goalSchemas";

export type GoalFormMode = "create" | "edit";

type GoalFormProps = {
    mode: GoalFormMode;
    /** Closes the modal wrapping the form (undefined outside one). */
    onClose?: () => void;
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

/**
 * The mockup's form: name, description, motivation, icon, target + unit, period
 * (start/end), term as a segmented control, and categories.
 *
 * "Current progress" stays out on purpose: it starts at 0 and climbs through the
 * card's stepper. Status is derived the same way (the first increment starts the
 * goal), so it has no field on create either — but an edit can set it back, which
 * is the only way to say a goal you moved by accident never started.
 *
 * COMPLETED is not on offer here. Completion is the card's Complete/Undo button,
 * the one path that pays and takes back the XP.
 */
function GoalForm({ mode, onClose }: GoalFormProps) {
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
        formState: { errors, isSubmitting }
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
        onClose?.();
    };

    const onSubmit = async (values: GoalFormValues) => {
        clearErrors("root");
        setApiError(null);

        // Progress and status have no field: on edit they keep the real value
        // (the card's stepper is what moves them), on create they start at zero.
        const currentValue = mode === "edit" ? Number(values.currentValue) : 0;
        const status = mode === "edit" ? values.status : "NOT_STARTED";

        const response =
            mode === "edit"
                ? await editGoal(
                      goalId,
                      values.title,
                      values.iconId,
                      values.description,
                      Number(values.targetValue),
                      values.unit,
                      currentValue,
                      completeEdit,
                      values.categoriesId,
                      values.motivation,
                      values.startDate,
                      values.endDate,
                      status,
                      values.term,
                      t
                  )
                : await createGoal(
                      values.title,
                      values.iconId,
                      values.description,
                      Number(values.targetValue),
                      values.unit,
                      currentValue,
                      values.categoriesId,
                      values.motivation,
                      values.startDate,
                      values.endDate,
                      status,
                      values.term,
                      t
                  );

        if (response?.success) {
            const newGoals = await getGoals(t);
            if (Array.isArray(newGoals.success)) {
                dispatch(enterGoals(newGoals.success));
            }
            toast.success(t(mode === "edit" ? "edited successfully" : "created successfully"));
            handleCancel();
            onClose?.();
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

    // A completed goal shows its status and nothing more: the segments are there
    // so the state is readable, disabled so the only way out stays the card's Undo,
    // which is what gives the XP back.
    const isCompletedGoal = statusEdit === "COMPLETED";
    const statusOptions = isCompletedGoal
        ? [{ value: "COMPLETED", label: t("Completed"), disabled: true }]
        : [
              { value: "NOT_STARTED", label: t("Not Started") },
              { value: "IN_PROGRESS", label: t("In Progress") },
          ];

    // No width here: the caller decides (w-full on loose fields, flex on
    // two-field rows). With `w-full` baked in, the unit's `flex-1` and the
    // target's `w-28` lost to CSS order and the field collapsed.
    const controlClass =
        "rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40";
    const fieldClass = `w-full ${controlClass}`;
    const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-text-2";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="text-text">
            <div>
                <label htmlFor="goal-title" className={labelClass}>{t("Name")}</label>
                <Controller
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <input
                            id="goal-title"
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("GoalTitlePlaceholder")}
                            className={`${fieldClass} ${errors.title ? "border-danger" : ""}`}
                        />
                    )}
                />
                {errors.title?.message && <p className="mt-1.5 text-xs text-danger">{errors.title.message}</p>}
            </div>

            <div className="mt-4">
                <label htmlFor="goal-description" className={labelClass}>{t("Description")}</label>
                <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                        <textarea
                            id="goal-description"
                            rows={3}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("GoalDescriptionPlaceholder")}
                            className={`${fieldClass} resize-none`}
                        />
                    )}
                />
            </div>

            <div className="mt-4">
                <label htmlFor="goal-motivation" className={labelClass}>{t("Motivation")}</label>
                <Controller
                    control={control}
                    name="motivation"
                    render={({ field }) => (
                        <input
                            id="goal-motivation"
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("GoalMotivationPlaceholder")}
                            className={fieldClass}
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
                <span className={labelClass}>{t("Target")}</span>
                <div className="flex gap-2">
                    <Controller
                        control={control}
                        name="targetValue"
                        render={({ field }) => (
                            <input
                                type="number"
                                inputMode="numeric"
                                aria-label={t("Target")}
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                                className={`${controlClass} w-24 shrink-0 font-mono ${errors.targetValue ? "border-danger" : ""}`}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="unit"
                        render={({ field }) => (
                            <input
                                type="text"
                                aria-label={t("Unit")}
                                placeholder={t("GoalUnitPlaceholder")}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                className={`${controlClass} min-w-0 flex-1 ${errors.unit ? "border-danger" : ""}`}
                            />
                        )}
                    />
                </div>
                {errors.targetValue?.message && (
                    <p className="mt-1.5 text-xs text-danger">{errors.targetValue.message}</p>
                )}
                {errors.unit?.message && <p className="mt-1.5 text-xs text-danger">{errors.unit.message}</p>}
                <span className="mt-1.5 block font-mono text-[10.5px] text-text-3">
                    {t("GoalProgressStartsAtZero")}
                </span>
            </div>

            <div className="mt-4">
                <span className={labelClass}>{t("Period")}</span>
                <div className="flex gap-2">
                    <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                            <input
                                type="date"
                                aria-label={t("StartDate")}
                                value={field.value}
                                onChange={field.onChange}
                                className={`${controlClass} min-w-0 flex-1 font-mono ${errors.startDate ? "border-danger" : ""}`}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="endDate"
                        render={({ field }) => (
                            <input
                                type="date"
                                aria-label={t("EndDate")}
                                value={field.value}
                                onChange={field.onChange}
                                className={`${controlClass} min-w-0 flex-1 font-mono ${errors.endDate ? "border-danger" : ""}`}
                            />
                        )}
                    />
                </div>
                {errors.startDate?.message && (
                    <p className="mt-1.5 text-xs text-danger">{errors.startDate.message}</p>
                )}
                {errors.endDate?.message && <p className="mt-1.5 text-xs text-danger">{errors.endDate.message}</p>}
            </div>

            <div className="mt-4">
                <span className={labelClass}>{t("Term")}</span>
                <Controller
                    control={control}
                    name="term"
                    render={({ field }) => (
                        <SegmentedControl
                            className="w-full"
                            label={t("Term")}
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                                { value: "SHORT_TERM", label: t("Short Term") },
                                { value: "MEDIUM_TERM", label: t("Medium Term") },
                                { value: "LONG_TERM", label: t("Long Term") },
                            ]}
                        />
                    )}
                />
            </div>

            {mode === "edit" && (
                <div className="mt-4">
                    <span className={labelClass}>{t("Status")}</span>
                    <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                            <SegmentedControl
                                className="w-full"
                                label={t("Status")}
                                value={field.value}
                                onChange={field.onChange}
                                options={statusOptions}
                            />
                        )}
                    />
                    {isCompletedGoal && (
                        <span className="mt-1.5 block text-[10.5px] text-text-3">
                            {t("GoalStatusLockedByCompletion")}
                        </span>
                    )}
                </div>
            )}

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
                            chosenCategories={null}
                            chosenCategoriesId={mode === "edit" ? field.value : undefined}
                        />
                    )}
                />
            </div>

            {errors.root?.message && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
            <ErrorNotice error={apiError} className="mt-2" />

            <div className="mt-[18px] flex justify-end gap-2">
                <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={handleCancel} />
                <Button
                    text={t("Save goal")}
                    mode="primary"
                    size="medium"
                    type="submit"
                    disabled={isSubmitting}
                />
            </div>
        </form>
    );
}

export default GoalForm;
