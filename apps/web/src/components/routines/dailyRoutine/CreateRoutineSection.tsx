import { useEffect, useState } from "react";
import IconsBoxSmall from "../../inputs/iconsBoxSmall";
import { useTranslation } from "react-i18next";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { v4 as uuidv4 } from "uuid";
import BeyouIcon from "../../../ui/BeyouIcon";
import { resolveIcon } from "@beyou/icons";
import { formatTimeRange } from "../routineMetrics";
import { FiX } from "react-icons/fi";
import Button from "../../Button";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routineSectionSchema } from "@beyou/validation/forms/routineSchemas";

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

    const fieldClass =
        "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40";
    const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-text-2";

    return (
        <div>
            <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold tracking-[-0.01em] text-text">
                    {editSection ? t("Edit Routine Section") : t("Creating Routine Section")}
                </h2>
                {onClose && (
                    <button
                        type="button"
                        aria-label={t("Close")}
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                    >
                        <FiX />
                    </button>
                )}
            </div>

            <div className="mt-3.5">
                <label className={labelClass} htmlFor="section-name">{t("name")}</label>
                <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                        <input
                            id="section-name"
                            type="text"
                            placeholder={t("Cozy Morning")}
                            value={field.value}
                            onChange={field.onChange}
                            className={`${fieldClass} ${errors.name ? "border-danger" : ""}`}
                        />
                    )}
                />
                {errors.name?.message && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass} htmlFor="section-start">{t("Start time")}</label>
                    <Controller
                        control={control}
                        name="startTime"
                        render={({ field }) => (
                            <input
                                id="section-start"
                                type="time"
                                value={field.value}
                                onChange={field.onChange}
                                className={`${fieldClass} font-mono ${errors.startTime ? "border-danger" : ""}`}
                            />
                        )}
                    />
                    {errors.startTime?.message && (
                        <p className="mt-1.5 text-xs text-danger">{errors.startTime.message}</p>
                    )}
                </div>
                <div>
                    <label className={labelClass} htmlFor="section-end">{t("End time")}</label>
                    <Controller
                        control={control}
                        name="endTime"
                        render={({ field }) => (
                            <input
                                id="section-end"
                                type="time"
                                value={field.value || ""}
                                onChange={field.onChange}
                                className={`${fieldClass} font-mono`}
                            />
                        )}
                    />
                </div>
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
                            iconError={""}
                            setSelectedIcon={field.onChange}
                            selectedIcon={field.value || ""}
                        />
                    )}
                />
            </div>

            {/* Seções favoritas viram modelo: reaproveitar uma pronta é o
                caminho mais rápido para montar a rotina seguinte. */}
            {editSection == null && favoritedSections.length > 0 && (
                <div className="mt-4">
                    <span className={labelClass}>{t("Your favorite sections")}</span>
                    <div className="flex flex-col gap-1.5">
                        {favoritedSections.map((section) => {
                            const hasIcon = resolveIcon(section.iconId).kind !== "fallback";
                            return (
                                <div
                                    key={section.id}
                                    className="flex items-center gap-2.5 rounded-control border border-border bg-bg px-2.5 py-2"
                                >
                                    {hasIcon && (
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[13px] text-accent">
                                            <BeyouIcon id={section.iconId} />
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-text">
                                        {section.name}
                                    </span>
                                    <span className="shrink-0 font-mono text-[11px] text-text-3">
                                        {formatTimeRange(section.startTime, section.endTime)}
                                    </span>
                                    <button
                                        type="button"
                                        className="shrink-0 rounded-lg bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent transition-colors duration-200 hover:bg-accent/15"
                                        onClick={() => handleUseFavorite(section)}
                                    >
                                        {t("Use")}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-[18px] flex justify-end gap-2">
                {onClose && <Button text={t("Cancel")} mode="ghost" size="medium" onClick={onClose} />}
                <Button
                    text={editSection ? t("Save section") : t("Create section")}
                    mode="primary"
                    size="medium"
                    type="submit"
                    onClick={editSection ? handleSubmit(handleUpdate) : handleSubmit(handleCreate)}
                />
            </div>
        </div>
    );
};

export default CreateRoutineSection;
