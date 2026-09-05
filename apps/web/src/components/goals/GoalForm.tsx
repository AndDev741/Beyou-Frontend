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
import { depthOf, eligibleParents, parseLocalDate } from "@beyou/state";
import type { goal as GoalType } from "@beyou/types/goals/goalType";

export type GoalFormMode = "create" | "edit";

type GoalFormProps = {
    mode: GoalFormMode;
    /** Closes the modal wrapping the form (undefined outside one). */
    onClose?: () => void;
    /**
     * Create mode only: the goal this one is being added under ("Add sub-goal" on a
     * card). Pre-selects the parent and borrows its categories and deadline as a
     * starting point; everything stays editable.
     */
    defaultParentId?: string;
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
    /** "" for a main goal; the select cannot hold null. */
    parentId: string;
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
    term: "SHORT_TERM",
    parentId: ""
};

/** The form's ISO day for a goal date that may arrive as a Date or a string. */
const toIsoDay = (value: Date | string | null | undefined): string => {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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
function GoalForm({ mode, onClose, defaultParentId }: GoalFormProps) {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const [search, setSearch] = useState("");
    const allGoals = useSelector((state: RootState) => state.goals.goals) || [];

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
    const parentIdEdit = useSelector((state: RootState) => state.editGoal.parentId);

    // The parent a fresh create starts from, when the card's "Add sub-goal" opened us.
    const defaultParent = useMemo<GoalType | undefined>(
        () => (mode === "create" && defaultParentId ? allGoals.find((g) => g.id === defaultParentId) : undefined),
        [allGoals, defaultParentId, mode]
    );
    const createDefaults = useMemo<GoalFormValues>(
        () =>
            defaultParent
                ? {
                      ...defaultValues,
                      parentId: defaultParent.id,
                      categoriesId: Object.keys(defaultParent.categories ?? {}),
                      endDate: toIsoDay(defaultParent.endDate)
                  }
                : defaultValues,
        [defaultParent]
    );

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
            term: termEdit || "",
            parentId: parentIdEdit ?? ""
        }),
        [
            parentIdEdit,
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
        watch,
        formState: { errors, isSubmitting }
    } = useForm<GoalFormValues>({
        resolver: zodResolver(goalFormSchema(t)),
        mode: "onBlur",
        defaultValues: mode === "edit" ? editDefaults : createDefaults
    });

    // Which goals may be the parent: the same rule the server applies (not itself, not a
    // descendant, and the chain still fits in three levels), so the picker never offers
    // something the save would refuse. Sorted by name; a second-level goal is marked with
    // an arrow so the list reads as the tree it is.
    const parentOptions = useMemo(() => {
        const eligible = eligibleParents(allGoals, mode === "edit" ? goalId : undefined);
        return [...eligible]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
            .map((g) => ({ id: g.id, label: `${depthOf(allGoals, g.id) > 1 ? "\u21b3 " : ""}${g.name}` }));
    }, [allGoals, goalId, mode]);

    const chosenParentId = watch("parentId");
    const chosenEndDate = watch("endDate");
    const chosenParent = chosenParentId ? allGoals.find((g) => g.id === chosenParentId) : undefined;
    // A warning, not a rule: a sub-goal that outlives its main goal is odd, but the person
    // may know something the form does not.
    const endsAfterParent = Boolean(
        chosenParent &&
            chosenEndDate &&
            (parseLocalDate(chosenEndDate)?.getTime() ?? 0) >
                (parseLocalDate(toIsoDay(chosenParent.endDate))?.getTime() ?? Number.POSITIVE_INFINITY)
    );

    useEffect(() => {
        if (mode === "edit") {
            reset(editDefaults);
            setSearch(iconId || "");
        }
    }, [editDefaults, iconId, mode, reset]);

    // The goals list may arrive after the modal opened; the borrowed values land then.
    useEffect(() => {
        if (mode === "create" && defaultParent) {
            reset(createDefaults);
        }
    }, [createDefaults, defaultParent, mode, reset]);

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
                      t,
                      values.parentId || null
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
                      t,
                      values.parentId || null
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

            <div className="mt-4">
                <label htmlFor="goal-parent" className={labelClass}>{t("ParentGoal")}</label>
                <Controller
                    control={control}
                    name="parentId"
                    render={({ field }) => (
                        <select
                            id="goal-parent"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            data-testid="goal-parent"
                            className={fieldClass}
                        >
                            <option value="">{t("ParentGoalNone")}</option>
                            {parentOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                />
                <span className="mt-1.5 block text-[10.5px] text-text-3">{t("ParentGoalHint")}</span>
                {endsAfterParent && (
                    <span className="mt-1 block text-[11px] text-flame" role="status">
                        {t("SubGoalEndsAfterParent")}
                    </span>
                )}
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
