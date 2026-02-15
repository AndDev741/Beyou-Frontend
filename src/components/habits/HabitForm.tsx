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
import ExperienceInput from "../inputs/experienceInput";
import Button from "../Button";
import { CgAddR } from "react-icons/cg";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../services/apiError";
import createHabit from "../../services/habits/createHabit";
import editHabit from "../../services/habits/editHabit";
import getHabits from "../../services/habits/getHabits";
import { RootState } from "../../redux/rootReducer";
import {
    editCaegoriesIdEnter,
    editDescriptionEnter,
    editDificultyEnter,
    editIconIdEnter,
    editImportanceEnter,
    editModeEnter,
    editMotivationalPhraseEnter,
    editNameEnter
} from "../../redux/habit/editHabitSlice";
import type { habit } from "../../types/habit/habitType";
import type category from "../../types/category/categoryType";
import { habitCreateSchema, habitEditSchema } from "../../validation/forms/habitSchemas";

export type HabitFormMode = "create" | "edit";

type HabitFormProps = {
    mode: HabitFormMode;
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>;
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

function HabitForm({ mode, setHabits }: HabitFormProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
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

    const alreadyChosenCategories: category[] = categoriesToEdit || [];

    const editDefaults = useMemo<HabitFormValues>(
        () => ({
            name: nameToEdit || "",
            description: descriptionToEdit || "",
            motivationalPhrase: motivationalPhraseToEdit || "",
            importance: importanceToEdit ?? 0,
            difficulty: difficultyToEdit ?? 0,
            iconId: iconIdToEdit || "",
            categoriesId: (categoriesToEdit || []).map((category) => category.id)
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
        formState: { errors }
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
            const newHabits = await getHabits(t);
            if (Array.isArray(newHabits.success)) {
                setHabits(newHabits.success);
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
        <div
            className="bg-background"
            data-tutorial-id={mode === "create" ? "habit-create-form" : undefined}
        >
            <div className="flex text-3xl items-center justify-center mt-3 mb-3">
                <CgAddR className="w-[40px] h-[40px] mr-1" />
                <h1>{t(mode === "edit" ? "EditHabit" : "CreateHabit")}</h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center px-2">
                <div className="flex md:items-start md:flex-row justify-center">
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
                                    minH={mode === "edit" ? 110 : 213}
                                    minHSmallScreen={mode === "edit" ? 123 : 146}
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
                                <IconsBox
                                    search={search}
                                    setSearch={setSearch}
                                    iconError={errors.iconId?.message ?? ""}
                                    selectedIcon={field.value}
                                    setSelectedIcon={field.onChange}
                                    t={t}
                                    minLgH={mode === "edit" ? 255 : 272}
                                    minHSmallScreen={mode === "edit" ? 262 : 200}
                                />
                            )}
                        />

                        {mode === "create" && (
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
                        )}
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
                </div>

                {errors.root?.message && (
                    <p className="text-error text-center mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center" />

                {mode === "edit" ? (
                    <div className="flex w-full items-center justify-evenly my-6">
                        <Button text={t("Cancel")} mode="cancel" size="medium" type="button" onClick={handleCancel} />
                        <Button text={t("Edit")} mode="create" size="medium" />
                    </div>
                ) : (
                    <div className="mb-3">
                        <Button text={t("Create")} mode="create" size="big" />
                    </div>
                )}
            </form>
        </div>
    );
}

export default HabitForm;
