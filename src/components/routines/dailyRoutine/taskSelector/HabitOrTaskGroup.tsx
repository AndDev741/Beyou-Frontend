import { habit } from "../../../../types/habit/habitType";
import { RoutineSection } from "../../../../types/routine/routineSection";
import { task } from "../../../../types/tasks/taskType";
import iconSearch from "../../../icons/iconsSearch";

interface HabitOrTaskGroupProps {
    habit?: habit;
    task?: task;
    setRoutineSection: React.Dispatch<React.SetStateAction<RoutineSection[]>>;
    index: number;
    setOpenTaskSelector: React.Dispatch<React.SetStateAction<boolean>>;
    startTime: string;
    endTime?: string;
    section: RoutineSection;
}

const HabitOrTaskGroup = ({ habit, task, setRoutineSection, index, setOpenTaskSelector, startTime, endTime, section }: HabitOrTaskGroupProps) => {
    const iconObj = iconSearch(habit?.iconId || task?.iconId || "");
    const Icon = iconObj?.IconComponent;
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

    return (
        <div className={`flex-shrink-0 w-[180px] max-w-[180px] flex flex-col items-start justify-start p-2 mt-2 border-[2px] border-primary rounded-lg mb-2 cursor-pointer mx-1 transition-colors duration-200 ${isSelected ? "bg-primary text-background dark:text-secondary" : "hover:bg-primary/10"}`}
            onClick={() => habit ? addHabitToSection(habit.id) : addTaskToSection(task!.id)}>
            {/* Habit or Task Name and Icon */}
            <div key={habit?.id || task?.id}
                className="w-full flex items-center">
                {Icon && <span className={`text-[30px] ${isSelected ? "text-background dark:text-secondary" : "text-icon"}`}><Icon /></span>}

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
