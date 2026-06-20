import { habit } from "@beyou/types/habit/habitType";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { task } from "@beyou/types/tasks/taskType";
import BeyouIcon from "../../../../ui/BeyouIcon";
import { resolveIcon } from "@beyou/icons";

interface HabitOrTaskGroupProps {
    habit?: habit;
    task?: task;
    setRoutineSection: React.Dispatch<React.SetStateAction<RoutineSection[]>>;
    index: number;
    setOpenTaskSelector: React.Dispatch<React.SetStateAction<boolean>>;
    startTime: string;
    endTime?: string;
    section: RoutineSection;
    disabled?: boolean;
}

const HabitOrTaskGroup = ({ habit, task, setRoutineSection, index, setOpenTaskSelector, startTime, endTime, section, disabled = false }: HabitOrTaskGroupProps) => {
    const itemIconId = habit?.iconId || task?.iconId || "";
    const hasIcon = resolveIcon(itemIconId).kind !== "fallback";
    const isSelected = section.habitGroup?.some((habitInGroup) => habitInGroup.habitId === habit?.id) || section.taskGroup?.some((taskInGroup) => taskInGroup.taskId === task?.id)

    const addHabitToSection = (habitId: string) => {
        setRoutineSection(prev =>
            prev.map((section, idx) =>
                idx === index
                    ? {
                        ...section,
                        habitGroup: [
                            ...(section.habitGroup || []),
                            { habitId: habitId, startTime: startTime, endTime: endTime || undefined }
                        ]
                    }
                    : section
            )
        );
        setOpenTaskSelector(false);
    };
    
    const addTaskToSection = (taskId: string) => {
        setRoutineSection(prev =>
            prev.map((section, idx) =>
                idx === index
                    ? {
                        ...section,
                        taskGroup: [
                            ...(section.taskGroup || []),
                            { taskId: taskId, startTime: startTime, endTime: endTime || undefined }
                        ]
                    }
                    : section
            )
        );
        setOpenTaskSelector(false);

    };

    const handleAdd = () => {
        if (disabled) return;
        habit ? addHabitToSection(habit.id) : addTaskToSection(task!.id);
    };

    return (
        <div
            className={`flex-shrink-0 w-[180px] max-w-[180px] flex flex-col items-start justify-start p-2 mt-2 border-[2px] border-primary rounded-lg mb-2 mx-1 transition-colors duration-200 ${isSelected ? "bg-primary text-background dark:text-secondary" : "hover:bg-primary/10"} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={handleAdd}
            aria-disabled={disabled}
        >
            {/* Habit or Task Name and Icon */}
            <div key={habit?.id || task?.id}
                className="w-full flex items-center">
                {hasIcon && <span className={`text-[30px] ${isSelected ? "text-background dark:text-secondary" : "text-icon"}`}><BeyouIcon id={itemIconId} /></span>}

                <span className={`text-md line-clamp-1 ml-1 ${isSelected ? "text-background dark:text-secondary" : "text-secondary"}`}>{habit?.name || task?.name}</span>
            </div>
            <div className="w-full flex items-center justify-between mt-3">
                <p className={`text-sm line-clamp-1 ${isSelected ? "text-background dark:text-secondary" : "text-description"}`}>
                    {habit?.level || habit?.level === 0 ? `Level ${habit?.level}` : task?.description || ""}
                </p>

                <p className={`text-sm ${isSelected ? "text-background dark:text-secondary" : "text-primary"}`}>{habit ? "habit" : "task"}</p>
            </div>
        </div>
    );
};

export default HabitOrTaskGroup;
