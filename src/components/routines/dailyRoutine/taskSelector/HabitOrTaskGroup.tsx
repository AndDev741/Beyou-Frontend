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
    section: RoutineSection;
}

const HabitOrTaskGroup = ({ habit, task, setRoutineSection, index, setOpenTaskSelector, startTime, section }: HabitOrTaskGroupProps) => {
    const iconObj = iconSearch(habit?.iconId || task?.iconId || "");
    const Icon = iconObj?.IconComponent;
    const isSelected = section.habitGroup?.some((habitInGroup) => habitInGroup.habitId === habit?.id) || section.taskGroup?.some((taskInGroup) => taskInGroup.TaskId === task?.id)

    const addHabitToSection = (habitId: string) => {
        setRoutineSection(prev =>
            prev.map((section, idx) =>
                idx === index
                    ? {
                        ...section,
                        habitGroup: [
                            ...(section.habitGroup || []),
                            { habitId: habitId, startTime: startTime }
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
                            { TaskId: taskId, startTime: startTime }
                        ]
                    }
                    : section
            )
        );
        setOpenTaskSelector(false);

    };

    return (
        <div className={`flex-shrink-0 w-[180px] max-w-[180px] flex flex-col items-start justify-start p-2 mt-2 border-[2px] border-blueMain rounded-lg mb-2  cursor-pointer mx-1 ${isSelected ? "bg-blueMain text-white" : "hover:bg-blue-50 transition-colors"}`}
            onClick={() => habit ? addHabitToSection(habit.id) : addTaskToSection(task!.id)}>
            {/* Habit or Task Name and Icon */}
            <div key={habit?.id || task?.id}
                className="w-full flex items-center">
                {Icon && <span className={`text-[30px] ${isSelected ? "black" : "text-blueMain"}`}><Icon /></span>}

                <span className="text-md line-clamp-1 ml-1">{habit?.name || task?.name}</span>
            </div>
            <div className="w-full flex items-center justify-between mt-3">
                <p className={`text-sm line-clamp-1 ${isSelected ? "test-white" : "text-gray-700"}`}>
                    {habit?.level || habit?.level === 0 ? `Level ${habit?.level}` : task?.description || ""}
                </p>

                <p className={`text-sm ${isSelected ? "tex-gray-700" : "text-blueMain"}`}>{habit ? "habit" : "task"}</p>
            </div>
        </div>
    );
};

export default HabitOrTaskGroup;