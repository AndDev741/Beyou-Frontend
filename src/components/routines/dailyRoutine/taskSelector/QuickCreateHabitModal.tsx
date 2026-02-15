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
import ExperienceInput from "../../../inputs/experienceInput";
import ChooseCategories from "../../../inputs/chooseCategory/chooseCategories";
import Button from "../../../Button";
import ErrorNotice from "../../../ErrorNotice";
import createHabit from "../../../../services/habits/createHabit";
import getHabits from "../../../../services/habits/getHabits";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../../../services/apiError";
import { enterHabits } from "../../../../redux/habit/habitsSlice";
import { habitCreateSchema } from "../../../../validation/forms/habitSchemas";
import type { habit } from "../../../../types/habit/habitType";

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

    return (
        <Modal isOpen={isOpen} onClose={closeAndReset}>
             <h2 className="text-2xl font-semibold text-center mb-2">{t("QuickCreateHabitTitle")}</h2>
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
                                    placeholder="CategoryNamePlaceholder"
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
                                    placeholder="HabitDescriptionPlaceholder"
                                    minH={120}
                                    minHSmallScreen={120}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="motivationalPhrase"
                            render={({ field }) => (
                                <GenericInput
                                    t={t}
                                    data={field.value}
                                    setData={field.onChange}
                                    dataError={errors.motivationalPhrase?.message ?? ""}
                                    placeholder="MotivationalPhrasePlaceholder"
                                    name="MotivationPhrase"
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

                        <Controller
                            control={control}
                            name="experience"
                            render={({ field }) => (
                                <ExperienceInput
                                    t={t}
                                    experience={field.value ?? 0}
                                    setExperience={field.onChange}
                                    experienceError={errors.experience?.message ?? ""}
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
                    <Button text={t("Create")} mode="create" size="medium" />
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
