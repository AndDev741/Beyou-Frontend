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
import createHabit from "@beyou/api/habits/createHabit";
import getHabits from "@beyou/api/habits/getHabits";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import { habitCreateSchema } from "@beyou/validation/forms/habitSchemas";
import type { habit } from "@beyou/types/habit/habitType";

type QuickCreateHabitModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (habitId?: string) => void;
};

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

function QuickCreateHabitModal({ isOpen, onClose, onCreated }: QuickCreateHabitModalProps) {
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
    } = useForm<HabitFormValues>({
        resolver: zodResolver(habitCreateSchema(t)),
        mode: "onBlur",
        defaultValues
    });

    const closeAndReset = () => {
        reset(defaultValues);
        setSearch("");
        setApiError(null);
        onClose();
    };

    const onSubmit = async (values: HabitFormValues) => {
        clearErrors("root");
        setApiError(null);

        const response = await createHabit(
            values.name,
            values.description,
            values.motivationalPhrase ?? "",
            values.importance,
            values.difficulty,
            values.iconId,
            Number(values.experience ?? 0),
            values.categoriesId,
            t
        );

        if (response?.success) {
            const newHabits = await getHabits(t);
            if (Array.isArray(newHabits.success)) {
                dispatch(enterHabits(newHabits.success));
                const match = findCreatedHabit(newHabits.success, values);
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
                    {t("QuickCreateHabitTitle")}
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
                    <label htmlFor="quick-habit-name" className={labelClass}>{t("Name")}</label>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <input
                                id="quick-habit-name"
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
                    <label htmlFor="quick-habit-description" className={labelClass}>{t("Description")}</label>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                            <textarea
                                id="quick-habit-description"
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
                    <label htmlFor="quick-habit-motivation" className={labelClass}>{t("MotivationPhrase")}</label>
                    <Controller
                        control={control}
                        name="motivationalPhrase"
                        render={({ field }) => (
                            <input
                                id="quick-habit-motivation"
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

                {errors.root?.message && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
                <ErrorNotice error={apiError} className="mt-2" />

                <div className="mt-[18px] flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={closeAndReset} />
                    <Button text={t("Save habit")} mode="primary" size="medium" type="submit" />
                </div>
            </form>
        </Modal>
    );
}

const findCreatedHabit = (habits: habit[], values: HabitFormValues) => {
    const exact = habits.filter((item) => item.name === values.name && item.iconId === values.iconId);
    if (exact.length > 0) return exact[exact.length - 1];
    const byName = habits.filter((item) => item.name === values.name);
    if (byName.length > 0) return byName[byName.length - 1];
    return undefined;
};

export default QuickCreateHabitModal;
