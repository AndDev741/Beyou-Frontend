import iconSearch from "../../icons/iconsSearch";
import { RoutineSection } from "../../../types/routine/routineSection";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import AddIcon from '../../../assets/addIcon.svg';
import { useState } from "react";
import TaskSelector from "./taskSelector/TaskAndHabitSelector";
import TaskAndHabitSelector from "./taskSelector/TaskAndHabitSelector";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";

interface SectionItemProps {
    section: RoutineSection;
    onEdit: () => void;
    onDelete: () => void;
    setRoutineSection?: React.Dispatch<React.SetStateAction<RoutineSection[]>>;
    index: number;
}

const SectionItem = ({ section, onEdit, onDelete, setRoutineSection, index }: SectionItemProps) => {
    const { t } = useTranslation();
    const iconObj = iconSearch(section.iconId);
    const Icon = iconObj?.IconComponent;
    const [openTaskSelector, setOpenTaskSelector] = useState(false);

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    console.log(allTasks)

    const getMergedItems = () => {
        const tasks = section.taskGroup?.map(item => ({
            type: 'task' as const,
            id: item.taskId,
            startTime: item?.startTime
        })) || [];

        const habits = section.habitGroup?.map(item => ({
            type: 'habit' as const,
            id: item.habitId,
            startTime: item?.startTime
        })) || [];

        return [...tasks, ...habits].sort((a, b) =>
            a?.startTime ? a.startTime.localeCompare(b.startTime) : 0 - (b?.startTime ? b.startTime.localeCompare(a.startTime) : 0)
        );
    };

    const mergedItems = getMergedItems();

    const [editingItem, setEditingItem] = useState<{
        type: 'task' | 'habit';
        index: number;
        startTime: string;
    } | null>(null);

    // Função para iniciar a edição de um item
    const handleStartEditItem = (itemType: 'task' | 'habit', itemIndex: number, currentStartTime: string) => {
        setEditingItem({
            type: itemType,
            index: itemIndex,
            startTime: currentStartTime
        });
    };

    // Função para salvar a edição de um item
    const handleSaveEditItem = (newTime: string) => {
        if (!setRoutineSection || !editingItem) return;

        setRoutineSection(prev =>
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                if (editingItem.type === 'task') {
                    const newTaskGroup = sectionItem.taskGroup?.map((task, i) =>
                        i === editingItem.index ? { ...task, startTime: newTime } : task
                    ) || [];
                    return { ...sectionItem, taskGroup: newTaskGroup };
                } else {
                    const newHabitGroup = sectionItem.habitGroup?.map((habit, i) =>
                        i === editingItem.index ? { ...habit, startTime: newTime } : habit
                    ) || [];
                    return { ...sectionItem, habitGroup: newHabitGroup };
                }
            })
        );

        setEditingItem(null);
    };

    // Função para cancelar a edição
    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    // Função para deletar um item
    const handleDeleteItem = (itemType: 'task' | 'habit', itemIndex: number) => {
        if (!setRoutineSection) return;

        setRoutineSection(prev =>
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                if (itemType === 'task') {
                    const newTaskGroup = sectionItem.taskGroup?.filter((_, i) => i !== itemIndex) || [];
                    return { ...sectionItem, taskGroup: newTaskGroup };
                } else {
                    const newHabitGroup = sectionItem.habitGroup?.filter((_, i) => i !== itemIndex) || [];
                    return { ...sectionItem, habitGroup: newHabitGroup };
                }
            })
        );
    };

    const validateTime = (newTime: string) => {
        if (newTime < section.startTime) {
            return false
        } else if (newTime > section.endTime) {
            return false
        }else{
            return true
        }
    }

    const renderItems = () => {
            console.log("MERGE ITEMS => ", mergedItems)

        return mergedItems.map((item, idx) => {
            let itemObj;
            let originalIndex: number;

            if (item.type === 'task') {
                originalIndex = section.taskGroup?.findIndex(t => t.taskId === item.id) ?? -1;
                itemObj = allTasks.find(task => task.id === item.id);
            } else {
                originalIndex = section.habitGroup?.findIndex(h => h.habitId === item.id) ?? -1;
                itemObj = allHabits.find(habit => habit.id === item.id);
            }
                            console.log(itemObj)

            if (!itemObj) return null;

            // Verifica se este item está sendo editado
            const isEditing = editingItem?.type === item.type && editingItem?.index === originalIndex;

            return (
                <div key={`${item.type}-${item.id}`} className="w-full flex items-center justify-between p-1 my-1">
                    <div className="flex items-center">
                        <input type="checkbox" className="accent-[#0082E1] w-6 h-6 rounded-lg" />
                        <span className="text-md text-gray-700 ml-2">
                            {itemObj.name}
                        </span>
                        <span className="mx-2">-</span>

                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="time"
                                    value={editingItem.startTime}
                                    onChange={(e) => setEditingItem(prev =>
                                        prev ? { ...prev, startTime: e.target.value } : null
                                    )}
                                    className="border border-blueMain rounded p-1"
                                />
                                <button
                                    onClick={() => handleSaveEditItem(editingItem.startTime)}
                                    className="text-green-500 hover:bg-green-100 p-1 rounded"
                                >
                                    Salvar
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="text-red-500 hover:bg-red-100 p-1 rounded"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="text-center text-blueMain text-lg">
                                    {item.startTime}
                                </span>
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        className="p-1 rounded hover:bg-blue-100 transition"
                                        title={t("Edit")}
                                        onClick={() => handleStartEditItem(item.type, originalIndex, item.startTime)}
                                    >
                                        <FiEdit2 className="text-blue-500 text-lg" />
                                    </button>
                                    <button
                                        className="p-1 rounded hover:bg-red-100 transition"
                                        title={t("Delete")}
                                        onClick={() => handleDeleteItem(item.type, originalIndex)}
                                    >
                                        <FiTrash2 className="text-red-500 text-lg" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col items-start justify-start w-full">
            {/* Section  Header */}
            <div className="w-full flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                    {Icon && <span className="text-[30px]"><Icon /></span>}
                    <span className="text-xl font-semibold text-blueMain line-clamp-1">{section.name}</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <span>
                            {section.startTime}
                        </span>
                        <span> - </span>
                        <span>
                            {section.endTime}
                        </span>
                    </div>
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

            {/* Habits or tasks added */}

            {/* Itens unificados e ordenados */}
            <div className="w-full flex flex-col items-start justify-start gap-2 mb-4">
                {renderItems()}
            </div>

            {/* Task or Habit Added and to add */}
            <div className="w-full flex items-start justify-start ml-[-2px] hover:cursor-pointer"
                onClick={() => setOpenTaskSelector(!openTaskSelector)}
            >
                <button
                    className="flex items-center justify-center"
                // onClick={() => { setShowModal(true); setEditIndex(null); }}
                >
                    <img
                        src={AddIcon}
                        alt={t('Routines icon alt')}
                        className="w-9 h-9 hover:scale-105 transition-all duration-200"
                    />
                    <span className='text-sm text-center font-medium ml-2 text-gray-700'>
                        {!openTaskSelector ? t("Add Habit or task") : t("Cancel Habit or task")}
                    </span>
                </button>
            </div>

            {openTaskSelector && (
                <div className="w-full flex flex-col items-center justify-center">
                    <TaskAndHabitSelector
                        setRoutineSection={setRoutineSection}
                        index={index}
                        section={section}
                        setOpenTaskSelector={setOpenTaskSelector}
                    />
                </div>
            )}
        </div>
    );
};

export default SectionItem;