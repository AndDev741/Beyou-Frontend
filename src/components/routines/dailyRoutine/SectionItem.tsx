import iconSearch from "../../icons/iconsSearch";
import { RoutineSection } from "../../../types/routine/routineSection";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface SectionItemProps {
    section: RoutineSection;
    onEdit: () => void;
    onDelete: () => void;
}

const SectionItem = ({ section, onEdit, onDelete }: SectionItemProps) => {
    const { t } = useTranslation();
    const iconObj = iconSearch(section.iconId);
    const Icon = iconObj?.IconComponent;

    return (
        <div className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
                {Icon && <span className="text-[30px]"><Icon /></span>}
                <span className="text-xl font-semibold text-blueMain">{section.name}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-md text-gray-500">{section.startTime} - {section.endTime}</span>
                <button
                    className="p-1 rounded hover:bg-blue-100 transition"
                    title={t("Edit")}
                    onClick={onEdit}
                >
                    <FiEdit2 className="text-blue-500 text-lg" />
                </button>
                <button
                    className="p-1 rounded hover:bg-red-100 transition"
                    title={t("Delete")}
                    onClick={onDelete}
                >
                    <FiTrash2 className="text-red-500 text-lg" />
                </button>
            </div>
        </div>
    );
};

export default SectionItem;