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
import createHabit from "@beyou/api/habits/createHabit";
import editHabit from "@beyou/api/habits/editHabit";
import { useSyncedHabits } from "../../hooks/useSyncedLists";
import { RootState } from "@beyou/state/rootReducer";
import {
    editCaegoriesIdEnter,
    editDescriptionEnter,
    editDificultyEnter,
    editIconIdEnter,
    editImportanceEnter,
    editModeEnter,
    editMotivationalPhraseEnter,
    editNameEnter
} from "@beyou/state/habit/editHabitSlice";
import type { habit } from "@beyou/types/habit/habitType";
import type category from "@beyou/types/category/categoryType";
import { habitCreateSchema, habitEditSchema } from "@beyou/validation/forms/habitSchemas";

export type HabitFormMode = "create" | "edit";

type HabitFormProps = {
    mode: HabitFormMode;
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>;
    /** The form lives in a modal: closing belongs to whoever opened it. */
    onClose?: () => void;
};

/** The title's id — the modal points aria-labelledby at it. */
export const HABIT_FORM_TITLE_ID = "habit-form-title";

type HabitFormValues = {
    name: string;
    description: string;
    motivationalPhrase: string;
    importance: number;
    difficulty: number;
    iconId: string;
    experience?: number;
    categoriesId: string[];
};

const defaultValues: HabitFormValues = {
    name: "",
    description: "",
    motivationalPhrase: "",
    importance: 0,
    difficulty: 0,
    iconId: "",
    experience: 0,
    categoriesId: []
};

function HabitForm({ mode, setHabits, onClose }: HabitFormProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const refreshHabits = useSyncedHabits();
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const [search, setSearch] = useState("");

    const habitId = useSelector((state: RootState) => state.editHabit.id);
    const nameToEdit = useSelector((state: RootState) => state.editHabit.name);
    const descriptionToEdit = useSelector((state: RootState) => state.editHabit.description);
    const motivationalPhraseToEdit = useSelector((state: RootState) => state.editHabit.motivationalPhrase);
    const iconIdToEdit = useSelector((state: RootState) => state.editHabit.iconId);
    const importanceToEdit = useSelector((state: RootState) => state.editHabit.importance);
    const difficultyToEdit = useSelector((state: RootState) => state.editHabit.dificulty);
    const categoriesToEdit = useSelector(
        (state: RootState) => state.editHabit.categories || [],
        shallowEqual
    );

    const alreadyChosenCategories: category[] = Array.isArray(categoriesToEdit)
        ? categoriesToEdit
        : Object.entries(categoriesToEdit || {}).map(([id, cat]) => ({ id, name: (cat as any).name, iconId: (cat as any).iconId } as category));

    const editDefaults = useMemo<HabitFormValues>(
        () => ({
            name: nameToEdit || "",
            description: descriptionToEdit || "",
            motivationalPhrase: motivationalPhraseToEdit || "",
            importance: importanceToEdit ?? 0,
            difficulty: difficultyToEdit ?? 0,
            iconId: iconIdToEdit || "",
            categoriesId: Array.isArray(categoriesToEdit)
                ? categoriesToEdit.map((category) => category.id)
                : Object.keys(categoriesToEdit || {})
        }),
        [
            nameToEdit,
            descriptionToEdit,
            motivationalPhraseToEdit,
            importanceToEdit,
            difficultyToEdit,
            iconIdToEdit,
            categoriesToEdit
        ]
    );

    const {
        control,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors, isSubmitting }
    } = useForm<HabitFormValues>({
        resolver: zodResolver(mode === "edit" ? habitEditSchema(t) : habitCreateSchema(t)),
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
        dispatch(editMotivationalPhraseEnter(""));
        dispatch(editIconIdEnter(null));
        dispatch(editImportanceEnter(""));
        dispatch(editDificultyEnter(""));
        dispatch(editCaegoriesIdEnter(""));
        onClose?.();
    };

    const onSubmit = async (values: HabitFormValues) => {
        clearErrors("root");
        setApiError(null);

        const response =
            mode === "edit"
                ? await editHabit(
                      habitId,
                      values.name,
                      values.description,
                      values.motivationalPhrase,
                      values.iconId,
                      values.importance,
                      values.difficulty,
                      values.categoriesId,
                      t
                  )
                : await createHabit(
                      values.name,
                      values.description,
                      values.motivationalPhrase,
                      values.importance,
                      values.difficulty,
                      values.iconId,
                      Number(values.experience ?? 0),
                      values.categoriesId,
                      t
                  );

        if (response?.success) {
            // The refetch also lands in the store (see useSyncedHabits): a rename saved here
            // used to live only in this page's list, and the focus screen kept the old name.
            const newHabits = await refreshHabits();
            if (newHabits) {
                setHabits(newHabits);
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
        <div className="text-text">
            {/* Modal header: title + close. */}
            <div className="flex items-center gap-3">
                <h2 id={HABIT_FORM_TITLE_ID} className="text-base font-semibold tracking-[-0.01em] text-text">
                    {t(mode === "edit" ? "EditHabit" : "CreateHabit")}
                </h2>
                {onClose && (
                    <IconButton label={t("Close")} onClick={onClose} className="ml-auto">
                        <X size={18} aria-hidden="true" />
                    </IconButton>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-3.5">
                <div>
                    <label htmlFor="habit-name" className={labelClass}>{t("Name")}</label>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <input
                                id="habit-name"
                                type="text"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder={t("HabitNamePlaceholder")}
                                className={`${fieldClass} ${errors.name ? "border-danger" : ""}`}
                            />
                        )}
                    />
                    {errors.name?.message && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
                </div>

                <div className="mt-4">
                    <label htmlFor="habit-description" className={labelClass}>{t("Description")}</label>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                            <textarea
                                id="habit-description"
                                rows={3}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder={t("HabitDescriptionPlaceholder")}
                                className={`${fieldClass} resize-none`}
                            />
                        )}
                    />
                </div>

                <div className="mt-4">
                    <label htmlFor="habit-motivation" className={labelClass}>{t("MotivationPhrase")}</label>
                    <Controller
                        control={control}
                        name="motivationalPhrase"
                        render={({ field }) => (
                            <input
                                id="habit-motivation"
                                type="text"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder={t("MotivationalPhrasePlaceholder")}
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

                {mode === "create" && (
                    <div className="mt-4">
                        <span className={labelClass}>{t("YourExperience")}</span>
                        <Controller
                            control={control}
                            name="experience"
                            render={({ field }) => (
                                <SegmentedControl
                                    className="w-full"
                                    label={t("YourExperience")}
                                    value={field.value ?? 0}
                                    onChange={field.onChange}
                                    options={[
                                        { value: 0, label: t("Beginner") },
                                        { value: 1, label: t("Intermediate") },
                                        { value: 2, label: t("Advanced") },
                                    ]}
                                />
                            )}
                        />
                        <span className="mt-1.5 block font-mono text-[10.5px] text-text-3">
                            {t("HabitExperienceCaption")}
                        </span>
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
                                chosenCategories={mode === "edit" ? alreadyChosenCategories : null}
                            />
                        )}
                    />
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
                        text={t("Save habit")}
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

export default HabitForm;
