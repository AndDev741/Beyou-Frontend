import { useEffect, useState } from "react";
import IconsBoxSmall from "../../inputs/iconsBoxSmall";
import { useTranslation } from "react-i18next";
import { RoutineSection } from "../../../types/routine/routineSection";
import { v4 as uuidv4 } from "uuid";
import iconSearch from "../../icons/iconsSearch";
import { formatTimeRange } from "../routineMetrics";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routineSectionSchema } from "../../../validation/forms/routineSchemas";

interface CreateRoutineSectionProps {
    setRoutineSection: React.Dispatch<React.SetStateAction<any>>;
    editSection?: RoutineSection;
    editIndex?: number | null;
    onUpdateSection?: (updatedSection: RoutineSection) => void;
    onClose?: () => void;
    routineSections: RoutineSection[];
}

type RoutineSectionFormValues = {
    name: string;
    startTime: string;
    endTime?: string;
    iconId?: string;
};

const defaultValues: RoutineSectionFormValues = {
    name: "",
    startTime: "",
    endTime: "",
    iconId: ""
};

const CreateRoutineSection = ({
    setRoutineSection,
    editSection,
    onUpdateSection,
    onClose,
    routineSections
}: CreateRoutineSectionProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<RoutineSectionFormValues>({
        resolver: zodResolver(routineSectionSchema(t)),
        mode: "onBlur",
        defaultValues: defaultValues
    });

    const favoritedSections = routineSections.filter((section) => section.favorite === true);

    useEffect(() => {
        if (editSection) {
            reset({
                name: editSection.name || "",
                startTime: editSection.startTime || "",
                endTime: editSection.endTime || "",
                iconId: editSection.iconId || ""
            });
            setSearch(editSection.iconId || "");
        } else {
            reset(defaultValues);
            setSearch("");
        }
    }, [editSection, reset]);

    const handleCreate = (values: RoutineSectionFormValues) => {
        const newSection: RoutineSection = {
            id: uuidv4(),
            name: values.name,
            startTime: values.startTime,
            endTime: values.endTime || "",
            iconId: values.iconId || "",
            order: 0,
            favorite: false
        };
        setRoutineSection((prev: RoutineSection[]) => [...prev, newSection]);
        reset(defaultValues);
        if (onClose) onClose();
    };

    const handleUpdate = (values: RoutineSectionFormValues) => {
        if (onUpdateSection) {
            const updatedSection: RoutineSection = {
                id: editSection?.id || uuidv4(),
                name: values.name,
                startTime: values.startTime,
                endTime: values.endTime || "",
                iconId: values.iconId || "",
                taskGroup: editSection?.taskGroup || [],
                habitGroup: editSection?.habitGroup || [],
                order: editSection?.order || 0,
                favorite: editSection?.favorite ?? false
            };
            onUpdateSection(updatedSection);
        }
        if (onClose) onClose();
    };

    const handleUseFavorite = (section: RoutineSection) => {
        const sectionWithId = {
            ...section,
            id: uuidv4(),
            taskGroup: section?.taskGroup?.map((group) => ({ ...group, id: null })),
            habitGroup: section?.habitGroup?.map((group) => ({ ...group, id: null })),
            favorite: false
        };

        setRoutineSection((prev: RoutineSection[]) => [...prev, sectionWithId]);
        reset(defaultValues);
        if (onClose) onClose();
    };

    return (
        <div>
            <h2 className="text-center mb-4">
                {editSection ? t("Edit Routine Section") : t("Creating Routine Section")}
            </h2>
            <div className="flex gap-3 md:gap-4">
                <div className="flex-1 flex flex-col gap-4">
                    <label className="font-medium text-secondary">
                        {t("name")}
                        <Controller
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <input
                                    type="text"
                                    placeholder={t("Cozy Morning")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    className="block w-full mt-1 border-2 border-primary rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-sm placeholder:text-placeholder bg-background text-secondary transition-colors duration-200"
                                />
                            )}
                        />
                        {errors.name?.message && (
                            <p className="text-error text-xs mt-1">{errors.name?.message}</p>
                        )}
                    </label>
                    <label className="font-medium text-secondary">
                        {t("Start time")}
                        <Controller
                            control={control}
                            name="startTime"
                            render={({ field }) => (
                                <input
                                    type="time"
                                    placeholder={"06:00"}
                                    value={field.value}
                                    onChange={field.onChange}
                                    className="block w-full mt-1 border-2 border-primary rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-secondary transition-colors duration-200"
                                />
                            )}
                        />
                        {errors.startTime?.message && (
                            <p className="text-error text-xs mt-1">{errors.startTime?.message}</p>
                        )}
                    </label>
                    <label className="font-medium text-secondary">
                        {t("End time")}
                        <Controller
                            control={control}
                            name="endTime"
                            render={({ field }) => (
                                <input
                                    type="time"
                                    placeholder={"12:00"}
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    className="block w-full mt-1 border-2 border-primary rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-secondary transition-colors duration-200"
                                />
                            )}
                        />
                    </label>
                </div>
                <div className="md:min-w-[223px] flex flex-col items-center">
                    <Controller
                        control={control}
                        name="iconId"
                        render={({ field }) => (
                            <IconsBoxSmall
                                search={search}
                                setSearch={setSearch}
                                t={t}
                                iconError={""}
                                setSelectedIcon={field.onChange}
                                selectedIcon={field.value || ""}
                            />
                        )}
                    />
                    {editSection ? (
                        <button
                            type="button"
                            className="mt-6 px-6 py-2 bg-primary text-background dark:text-secondary rounded-md font-semibold shadow transition-colors duration-200 hover:bg-primary/90"
                            onClick={handleSubmit(handleUpdate)}
                        >
                            {t("Edit")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="mt-6 px-6 py-2 bg-primary text-background dark:text-secondary rounded-md font-semibold shadow transition-colors duration-200 hover:bg-primary/90"
                            onClick={handleSubmit(handleCreate)}
                        >
                            {t("Create")}
                        </button>
                    )}
                </div>
            </div>

            <h1
                className={`${
                    editSection == null && favoritedSections?.length > 0 ? "" : "hidden"
                } text-center mt-2 text-secondary font-semibold text-lg`}
            >
                {t("Your favorite sections")}
            </h1>
            <div className="flex flex-col items-start justify-start w-full">
                {editSection == null &&
                    favoritedSections.map((section) => {
                        const iconObj = iconSearch(section.iconId);
                        const Icon = iconObj?.IconComponent;

                        return (
                            <div key={section.id} className="w-full flex items-center justify-between py-2">
                                <div className="flex items-center gap-2 w-full">
                                    {Icon && (
                                        <span className="text-[25px] md:text-[30px] text-icon">
                                            <Icon />
                                        </span>
                                    )}
                                    <span className="text-md md:text-xl font-semibold text-primary line-clamp-1">
                                        {section.name}
                                    </span>
                                    <span className="text-xs md:text-md">{formatTimeRange(section.startTime, section.endTime)}</span>
                                </div>

                                <button
                                    className="text-xs md:text-md hover:text-primary hover:scale-105 border border-primary rounded-md px-2 py-1 transition-all duration-200"
                                    onClick={() => handleUseFavorite(section)}
                                >
                                    {t("Use")}
                                </button>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default CreateRoutineSection;
