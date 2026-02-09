import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../Button";
import DescriptionInput from "../inputs/descriptionInput";
import IconsInput from "../inputs/iconsBox";
import GenericInput from "../inputs/genericInput";
import SelectorInput from "../inputs/SelectorInput";
import { CgAddR } from "react-icons/cg";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "../../services/apiError";
import createCategory from "../../services/categories/createCategory";
import editCategory from "../../services/categories/editCategory";
import getCategories from "../../services/categories/getCategories";
import { RootState } from "../../redux/rootReducer";
import { editModeEnter, idEnter, nameEnter, descriptionEnter, iconEnter } from "../../redux/category/editCategorySlice";
import type categoryGeneratedByAi from "../../types/category/categoryGeneratedByAiType";
import { categoryCreateSchema, categoryEditSchema } from "../../validation/forms/categorySchemas";

export type CategoryFormMode = "create" | "edit";

type CategoryFormProps = {
    mode: CategoryFormMode;
    dispatchFunction: any;
    generatedCategory?: categoryGeneratedByAi;
};

type CategoryFormValues = {
    name: string;
    description: string;
    experience?: number;
    iconId: string;
};

const defaultValues: CategoryFormValues = {
    name: "",
    description: "",
    experience: 0,
    iconId: ""
};

function CategoryForm({ mode, dispatchFunction, generatedCategory }: CategoryFormProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
    const [search, setSearch] = useState("");

    const categoryId = useSelector((state: RootState) => state.editCategory.id);
    const nameEdit = useSelector((state: RootState) => state.editCategory.name);
    const descriptionEdit = useSelector((state: RootState) => state.editCategory.description);
    const iconEdit = useSelector((state: RootState) => state.editCategory.icon);

    const editDefaults = useMemo<CategoryFormValues>(
        () => ({
            name: nameEdit || "",
            description: descriptionEdit || "",
            iconId: iconEdit || ""
        }),
        [nameEdit, descriptionEdit, iconEdit]
    );

    const {
        control,
        handleSubmit,
        reset,
        getValues,
        setError,
        clearErrors,
        formState: { errors }
    } = useForm<CategoryFormValues>({
        resolver: zodResolver(mode === "edit" ? categoryEditSchema(t) : categoryCreateSchema(t)),
        mode: "onBlur",
        defaultValues: mode === "edit" ? editDefaults : defaultValues
    });

    useEffect(() => {
        if (mode === "edit") {
            reset(editDefaults);
            setSearch(iconEdit || "");
        }
    }, [editDefaults, iconEdit, mode, reset]);

    useEffect(() => {
        if (mode === "create" && generatedCategory?.categoryName) {
            reset({
                ...getValues(),
                name: generatedCategory.categoryName,
                description: generatedCategory.description || ""
            });
        }
    }, [generatedCategory, mode, reset, getValues]);

    const handleCancel = () => {
        dispatch(editModeEnter(false));
        dispatch(idEnter(null));
        dispatch(nameEnter(""));
        dispatch(descriptionEnter(""));
        dispatch(iconEnter(""));
    };

    const onSubmit = async (values: CategoryFormValues) => {
        clearErrors("root");
        setApiError(null);

        const response =
            mode === "edit"
                ? await editCategory(categoryId, values.name, values.description, values.iconId, t)
                : await createCategory(
                      values.name,
                      values.description,
                      Number(values.experience ?? 0),
                      values.iconId,
                      t
                  );

        if (response?.success) {
            const categories = await getCategories(t);
            if (Array.isArray(categories.success)) {
                dispatch(dispatchFunction(categories.success));
            }
            if (mode === "edit") {
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
        <div className="bg-background">
            <div className="flex items-center justify-center text-3xl font-semibold">
                <CgAddR className="w-[40px] h-[40px] mr-1" />
                <h2>{t(mode === "edit" ? "EditCategory" : "CreateCategory")}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col mt-8">
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
                                    description={field.value}
                                    placeholder="DescriptionPlaceholder"
                                    setDescription={field.onChange}
                                    descriptionError={errors.description?.message ?? ""}
                                    minH={mode === "edit" ? 178 : 195}
                                    minHSmallScreen={mode === "edit" ? 110 : 195}
                                    t={t}
                                />
                            )}
                        />
                    </div>

                    <div className="mx-2"></div>

                    <div className="flex flex-col mt-1 w-auto">
                        <Controller
                            control={control}
                            name="iconId"
                            render={({ field }) => (
                                <IconsInput
                                    search={search}
                                    setSearch={setSearch}
                                    t={t}
                                    iconError={errors.iconId?.message ?? ""}
                                    setSelectedIcon={field.onChange}
                                    selectedIcon={field.value}
                                    minLgH={mode === "edit" ? 273 : 200}
                                    minHSmallScreen={mode === "edit" ? 200 : undefined}
                                />
                            )}
                        />

                        {mode === "create" && (
                            <Controller
                                control={control}
                                name="experience"
                                render={({ field }) => (
                                    <SelectorInput
                                        value={field.value ?? 0}
                                        setValue={field.onChange}
                                        errorPhrase={errors.experience?.message ?? ""}
                                        valuesToSelect={[
                                            { value: 0, title: "Begginer" },
                                            { value: 1, title: "Intermediary" },
                                            { value: 2, title: "Advanced" }
                                        ]}
                                        title={t("YourExperience")}
                                        t={t}
                                    />
                                )}
                            />
                        )}
                    </div>
                </div>

                {errors.root?.message && (
                    <p className="text-error text-center mt-2">{errors.root?.message}</p>
                )}
                <ErrorNotice error={apiError} className="text-center" />

                {mode === "edit" ? (
                    <div className="flex items-center justify-evenly mt-3">
                        <Button text={t("Cancel")} mode="cancel" size="medium" type="button" onClick={handleCancel} />
                        <Button text={t("Edit")} mode="create" size="medium" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center mt-6">
                        <Button text={t("Create")} mode="create" size="big" />
                    </div>
                )}
            </form>
        </div>
    );
}

export default CategoryForm;
