import iconSearch from "../../icons/iconsSearch";
import { RoutineSection } from "../../../types/routine/routineSection";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import TaskAndHabitSelector from "./taskSelector/TaskAndHabitSelector";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";
import { CgAddR } from "react-icons/cg";
import { AiFillStar } from "react-icons/ai";
import { formatTimeRange } from "../routineMetrics";

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
    const toleranceMinutes = 5;
    const isOvernight =
        section.startTime &&
        section.endTime &&
        section.endTime < section.startTime;

    const toMinutes = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    };

    const fromMinutes = (minutes: number) => {
        const total = (minutes + 1440) % 1440;
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    const addMinutes = (time: string, delta: number) => fromMinutes(toMinutes(time) + delta);

    const minStart = !isOvernight && section.startTime ? addMinutes(section.startTime, -toleranceMinutes) : undefined;
    const maxEnd = !isOvernight && section.endTime ? addMinutes(section.endTime, toleranceMinutes) : undefined;

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    const getMergedItems = () => {
        const tasks = section.taskGroup?.map(item => ({
            type: 'task' as const,
            id: item.taskId,
            startTime: item?.startTime,
            endTime: item?.endTime
        })) || [];

        const habits = section.habitGroup?.map(item => ({
            type: 'habit' as const,
            id: item.habitId,
            startTime: item?.startTime,
            endTime: item?.endTime
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
        endTime?: string;
    } | null>(null);

    // Função para iniciar a edição de um item
    const handleStartEditItem = (
        itemType: 'task' | 'habit',
        itemIndex: number,
        currentStartTime: string,
        currentEndTime?: string
    ) => {
        setEditingItem({
            type: itemType,
            index: itemIndex,
            startTime: currentStartTime,
            endTime: currentEndTime
        });
    };

    // Função para salvar a edição de um item
    const handleSaveEditItem = (newStartTime: string, newEndTime?: string) => {
        if (!setRoutineSection || !editingItem) return;

        setRoutineSection(prev =>
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                if (editingItem.type === 'task') {
                    const newTaskGroup = sectionItem.taskGroup?.map((task, i) =>
                        i === editingItem.index ? { ...task, startTime: newStartTime, endTime: newEndTime } : task
                    ) || [];
                    return { ...sectionItem, taskGroup: newTaskGroup };
                } else {
                    const newHabitGroup = sectionItem.habitGroup?.map((habit, i) =>
                        i === editingItem.index ? { ...habit, startTime: newStartTime, endTime: newEndTime } : habit
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

    const handleFavorite = () => {
        if (!setRoutineSection) return;

        setRoutineSection(prev => 
            prev.map((sectionItem, sectionIdx) => {
                if (sectionIdx !== index) return sectionItem;

                return {...sectionItem, favorite: !sectionItem?.favorite}
            })
        )
    }

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

    const renderItems = () => {

        return mergedItems.map((item) => {
            let itemObj;
            let originalIndex: number;

            if (item.type === 'task') {
                originalIndex = section.taskGroup?.findIndex(t => t.taskId === item.id) ?? -1;
                itemObj = allTasks.find(task => task.id === item.id);
            } else {
                originalIndex = section.habitGroup?.findIndex(h => h.habitId === item.id) ?? -1;
                itemObj = allHabits.find(habit => habit.id === item.id);
            }

            if (!itemObj) return null;

            // Verifica se este item está sendo editado
            const isEditing = editingItem?.type === item.type && editingItem?.index === originalIndex;

            return (
                <div key={`${item.type}-${item.id}`} className="w-full flex items-center justify-between my-1 bg-background transition-colors duration-200">
                    <div className="flex items-center">
                        <input type="checkbox" className="accent-primary w-6 h-6 rounded-lg border border-primary/30 bg-background transition-colors duration-200" />
                        <span className="text-md text-secondary ml-2">
                            {itemObj.name}
                        </span>
                        <span className="mx-2 text-description">-</span>

                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="time"
                                    value={editingItem.startTime}
                                    min={minStart}
                                    max={maxEnd}
                                    onChange={(e) => setEditingItem(prev =>
                                        prev
                                            ? {
                                                ...prev,
                                                startTime: e.target.value,
                                                endTime:
                                                    !isOvernight && prev.endTime && e.target.value && prev.endTime < e.target.value
                                                        ? e.target.value
                                                        : prev.endTime
                                            }
                                            : null
                                    )}
                                    className="border border-primary rounded p-1 bg-background text-secondary"
                                />
                                <input
                                    type="time"
                                    value={editingItem.endTime || ""}
                                    min={!isOvernight ? editingItem.startTime || minStart : undefined}
                                    max={maxEnd}
                                    onChange={(e) => setEditingItem(prev =>
                                        prev ? { ...prev, endTime: e.target.value } : null
                                    )}
                                    className="border border-primary rounded p-1 bg-background text-secondary"
                                />
                                <button
                                    onClick={() => handleSaveEditItem(editingItem.startTime, editingItem.endTime)}
                                    className="text-success hover:bg-success/10 p-1 rounded transition-colors duration-200"
                                >
                                    Salvar
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="text-error hover:bg-error/10 p-1 rounded transition-colors duration-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="text-center text-primary text-lg">
                                    {formatTimeRange(item.startTime, item.endTime)}
                                </span>
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        className="p-1 rounded hover:bg-primary/10 transition-colors duration-200"
                                        title={t("Edit")}
                                        onClick={() => handleStartEditItem(item.type, originalIndex, item.startTime, item.endTime)}
                                    >
                                        <FiEdit2 className="text-primary text-lg" />
                                    </button>
                                    <button
                                        className="p-1 rounded hover:bg-error/10 transition-colors duration-200"
                                        title={t("Delete")}
                                        onClick={() => handleDeleteItem(item.type, originalIndex)}
                                    >
                                        <FiTrash2 className="text-error text-lg" />
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
                <div className="flex items-center gap-2 w-full">
                    {Icon && <span className="text-[30px] text-icon"><Icon /></span>}
                    <span className="text-xl font-semibold text-primary line-clamp-1">{section.name}</span>
                </div>
                {/* I ALREADY SPEND TOO MUCH TIME TRYING TO UNDERSTAND WHY WHEN I OPEN THE TASK SELECTOR THE HEADER JUST GO TO THE RIGHT... THIS WILL FIX ****  */}
                <div className={`${openTaskSelector ? "mr-3" : ""} flex items-center gap-2`}>
                    <div className="flex items-center gap-1 text-description whitespace-nowrap">
                        <span>
                            {formatTimeRange(section.startTime, section.endTime)}
                        </span>
                    </div>
                    <button
                        className="rounded hover:bg-primary/10 transition-colors duration-200"
                        title={t("Edit")}
                        onClick={onEdit}
                    >
                        <FiEdit2 className="text-primary text-lg" />
                    </button>
                    <button
                        className="rounded hover:bg-error/10 transition-colors duration-200"
                        title={t("Delete")}
                        onClick={onDelete}
                    >
                        <FiTrash2 className="text-error text-lg" />
                    </button>
                     <button
                        className="rounded hover:bg-error/10 transition-colors duration-200"
                        //title={t("Delete")}
                        onClick={() => handleFavorite()}
                    >
                        <AiFillStar className={`${section.favorite ? "text-yellow-500" : "text-secondary"} text-lg`} />
                    </button>
                </div>
            </div>

            {/* Habits or tasks added */}

            {/* Itens unificados e ordenados */}
            <div className="w-full flex flex-col items-start justify-start gap-2 mb-4">
                {renderItems()}
            </div>

            {/* Task or Habit Added and to add */}
            <div className="w-full flex items-start justify-starthover:cursor-pointer"
                onClick={() => setOpenTaskSelector(!openTaskSelector)}
            >
                <button
                    className="flex items-center justify-center hover:scale-105"
                // onClick={() => { setShowModal(true); setEditIndex(null); }}
                >
                    <CgAddR className='w-[30px] h-[30px] mr-1 '/>    
                    <span className='text-sm text-center font-medium ml-1 text-secondary'>
                        {!openTaskSelector ? t("Add Habit or task") : t("Cancel Habit or task")}
                    </span>
                </button>
            </div>

            {openTaskSelector && (
                <div className="w-[100%] md:w-full flex flex-col items-center justify-center">
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
