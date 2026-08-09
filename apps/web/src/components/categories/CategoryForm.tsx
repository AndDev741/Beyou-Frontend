import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../Button";
import IconsBoxSmall from "../inputs/iconsBoxSmall";
import SegmentedControl from "../../ui/SegmentedControl";
import { toast } from "react-toastify";
import ErrorNotice from "../ErrorNotice";
import { ApiErrorPayload, getFriendlyErrorMessage } from "@beyou/api/apiError";
import createCategory from "@beyou/api/categories/createCategory";
import editCategory from "@beyou/api/categories/editCategory";
import getCategories from "@beyou/api/categories/getCategories";
import { RootState } from "@beyou/state/rootReducer";
import { editModeEnter, idEnter, nameEnter, descriptionEnter, iconEnter } from "@beyou/state/category/editCategorySlice";
import type categoryGeneratedByAi from "@beyou/types/category/categoryGeneratedByAiType";
import { categoryCreateSchema, categoryEditSchema } from "@beyou/validation/forms/categorySchemas";

export type CategoryFormMode = "create" | "edit";

type CategoryFormProps = {
    mode: CategoryFormMode;
    dispatchFunction: any;
    generatedCategory?: categoryGeneratedByAi;
    /** Used by the category picker's quick-create. */
    onCreated?: (values: { name: string; description: string; iconId: string }) => void;
    onClose?: () => void;
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

/**
 * The mockup's form: name, description, icon and experience as a segmented control
 * (creation only — an edit cannot change the XP curve through the API).
 */
function CategoryForm({ mode, dispatchFunction, generatedCategory, onCreated, onClose }: CategoryFormProps) {
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
        formState: { errors, isSubmitting }
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
        // In a modal, cancel has to close — the create's visibility lives in page
        // state, not in the edit slice.
        onClose?.();
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
            toast.success(t(mode === "edit" ? "edited successfully" : "created successfully"));
            if (mode === "create") {
                onCreated?.({
                    name: values.name,
                    description: values.description,
                    iconId: values.iconId
                });
            }
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

    const fieldClass =
        "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40";
    const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-text-2";

    return (
        <form
            onSubmit={(e) => { e.stopPropagation(); handleSubmit(onSubmit)(e); }}
            className="text-text"
            data-tutorial-id={mode === "create" ? "category-create-form" : undefined}
        >
            <div>
                <label htmlFor="category-name" className={labelClass}>{t("Name")}</label>
                <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                        <input
                            id="category-name"
                            type="text"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("CategoryNamePlaceholder")}
                            className={`${fieldClass} ${errors.name ? "border-danger" : ""}`}
                        />
                    )}
                />
                {errors.name?.message && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
            </div>

            <div className="mt-4">
                <label htmlFor="category-description" className={labelClass}>{t("Description")}</label>
                <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                        <textarea
                            id="category-description"
                            rows={3}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("DescriptionPlaceholder")}
                            className={`${fieldClass} resize-none`}
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
                        {t("CategoryExperienceCaption")}
                    </span>
                </div>
            )}

            {errors.root?.message && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
            <ErrorNotice error={apiError} className="mt-2" />

            <div className="mt-[18px] flex justify-end gap-2">
                <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={handleCancel} />
                <Button
                    text={t("Save category")}
                    mode="primary"
                    size="medium"
                    type="submit"
                    disabled={isSubmitting}
                />
            </div>
        </form>
    );
}

export default CategoryForm;
