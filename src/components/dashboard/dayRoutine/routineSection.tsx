import { useTranslation } from "react-i18next";
import { RoutineSection as section } from "../../../types/routine/routineSection";
import iconSearch from "../../icons/iconsSearch";
import { FiEdit2 } from "react-icons/fi";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";

export default function RoutineSection({ section }: { section: section }) {
    const { t } = useTranslation();
    const iconObj = iconSearch(section.iconId);
    const Icon = iconObj?.IconComponent;

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

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

    console.log(mergedItems)

    const renderItems = () => {
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

            if (!itemObj) return null;

            return (
                <div key={`${item.type}-${item.id}`} className="w-full flex items-center justify-between p-1 mt-1">
                    <div className="flex items-center">
                        <input type="checkbox" className="accent-[#0082E1] border-blueMain w-6 h-6 rounded-xl cursor-pointer" />
                        <span className="text-md text-gray-700 ml-2">
                            {itemObj.name}
                        </span>
                        <span className="mx-2">-</span>
                        <span className="text-center text-blueMain text-lg">
                            {item.startTime}
                        </span>

                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col items-start justify-center w-full h-full">
            <div className="flex items-center gap-2">
                {Icon && <span className="text-[30px]"><Icon /></span>}
                <span className="text-xl font-semibold text-blueMain line-clamp-1">{section.name}
                    <span className="ml-4 text-lg text-gray-600">
                        {section.startTime} - {section.endTime}
                    </span>
                </span>

            </div>
    
            <div className="w-full flex flex-col items-start justify-start mb-4 mt-2">
                {renderItems()}
            </div>

        </div>
    )
}