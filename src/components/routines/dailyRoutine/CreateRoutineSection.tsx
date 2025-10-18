import { useState, useEffect } from "react";
import IconsBoxSmall from "../../inputs/iconsBoxSmall";
import { useTranslation } from "react-i18next";
import { RoutineSection } from "../../../types/routine/routineSection";
import {v4 as uuidv4} from "uuid";

interface CreateRoutineSectionProps {
    setRoutineSection: React.Dispatch<React.SetStateAction<any>>;
    editSection?: RoutineSection;
    editIndex?: number | null;
    onUpdateSection?: (updatedSection: RoutineSection) => void;
    onClose?: () => void;
}

const CreateRoutineSection = ({
    setRoutineSection,
    editSection,
    editIndex,
    onUpdateSection,
    onClose
}: CreateRoutineSectionProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");

    useEffect(() => {
        console.log("editSection", editSection);
        if (editSection) {
            setName(editSection.name || "");
            setStartTime(editSection.startTime || "");
            setEndTime(editSection.endTime || "");
            setSelectedIcon(editSection.iconId || "");
            setSearch(editSection.iconId || "");
        } else {
            setName("");
            setStartTime("");
            setEndTime("");
            setSelectedIcon("");
            setSearch("");
        }
    }, [editSection]);

    const handleCreate = () => {
        const newSection: RoutineSection = {
            id: uuidv4(),
            name,
            startTime,
            endTime,
            iconId: selectedIcon,
            order: 0
        };
        setRoutineSection((prev: RoutineSection[]) => [...prev, newSection]);
        setName("");
        setStartTime("");
        setEndTime("");
        setSelectedIcon("");
        if (onClose) onClose();
    };

    const handleUpdate = () => {
        console.log("editIndex", editIndex);
        if (onUpdateSection) {
            const updatedSection: RoutineSection = {
                id: editSection?.id || uuidv4(),
                name,
                startTime,
                endTime,
                iconId: selectedIcon,
                taskGroup: editSection?.taskGroup || [],
                habitGroup: editSection?.habitGroup || [],
                order: editSection?.order || 0
            };
            onUpdateSection(updatedSection);
        }
        if (onClose) onClose();
    };

    return (
        <div>
            <h2 className="text-center mb-4">
                {editSection ? t("Edit Routine Section") : t("Creating Routine Section")}
            </h2>
            <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-4">
                    <label className="font-medium text-secondary">
                        {t("name")}
                        <input
                            type="text"
                            placeholder={t("Cozy Morning")}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="block w-full mt-1 border-2 border-primary rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-sm placeholder:text-placeholder bg-background text-secondary transition-colors duration-200"
                        />
                    </label>
                    <label className="font-medium text-secondary">
                        {t("Start time")}
                        <input
                            type="time"
                            placeholder={"06:00"}
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="block w-full mt-1 border-2 border-primary rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-secondary transition-colors duration-200"
                        />
                    </label>
                    <label className="font-medium text-secondary">
                        {t("End time")}
                        <input
                            type="time"
                            placeholder={"12:00"}
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            className="block w-full mt-1 border-2 border-primary rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-secondary transition-colors duration-200"
                        />
                    </label>
                </div>
                <div className="min-w-[223px] flex flex-col items-center">
                    <IconsBoxSmall
                        search={search}
                        setSearch={setSearch}
                        t={t}
                        iconError={""}
                        setSelectedIcon={setSelectedIcon}
                        selectedIcon={selectedIcon}
                    />
                    {editSection ? (
                        <button
                            type="button"
                            className="mt-6 px-6 py-2 bg-primary text-background dark:text-secondary rounded-md font-semibold shadow transition-colors duration-200 hover:bg-primary/90"
                            onClick={handleUpdate}
                        >
                            {t("Edit")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="mt-6 px-6 py-2 bg-primary text-background dark:text-secondary rounded-md font-semibold shadow transition-colors duration-200 hover:bg-primary/90"
                            onClick={handleCreate}
                        >
                            {t("Create")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateRoutineSection;
