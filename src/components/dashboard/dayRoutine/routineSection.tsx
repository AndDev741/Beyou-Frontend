import { useTranslation } from "react-i18next";
import { RoutineSection as section } from "../../../types/routine/routineSection";
import iconSearch from "../../icons/iconsSearch";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";
import { itemGroupToCheck } from "../../../types/routine/itemGroupToCheck";
import checkRoutine from "../../../services/routine/checkItem";
import { useState } from "react";
import { RefreshUI } from "../../../types/refreshUi/refreshUi.type";
import useUiRefresh from "../../../hooks/useUiRefresh";
import { formatTimeRange } from "../../routines/routineMetrics";

export default function RoutineSection({ section, routineId}: { section: section, routineId: string }) {
    const { t } = useTranslation();
    const iconObj = iconSearch(section.iconId);
    const Icon = iconObj?.IconComponent;

    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    useUiRefresh(refreshUi);

    const getMergedItems = () => {
        const tasks = section.taskGroup?.map(item => ({
            type: 'task' as const,
            id: item.taskId,
            groupId: item.id,
            startTime: item?.startTime,
            endTime: item?.endTime,
            check: item?.taskGroupChecks
        })) || [];

        const habits = section.habitGroup?.map(item => ({
            type: 'habit' as const,
            id: item.habitId,
            groupId: item.id,
            startTime: item?.startTime,
            endTime: item?.endTime,
            check: item?.habitGroupChecks
        })) || [];

        return [...tasks, ...habits].sort((a, b) =>
            a?.startTime ? a.startTime.localeCompare(b.startTime) : 0 - (b?.startTime ? b.startTime.localeCompare(a.startTime) : 0)
        );
    };

     const handleCheck = async (groupToCheck: itemGroupToCheck) => {
        const refreshUiReponse = await checkRoutine(groupToCheck, t);
        if(refreshUiReponse?.success){
            setRefreshUi(refreshUiReponse.success as RefreshUI);
        }
     }

    const mergedItems = getMergedItems();

    const renderItems = () => {
        return mergedItems.map((item, index) => {
            let itemObj: any;

            if (item.type === 'task') {
                itemObj = allTasks?.find(task => task.id === item.id);
                itemObj = {
                    ...itemObj,
                    item
                }
            } else {
                itemObj = allHabits?.find(habit => habit.id === item.id);
                itemObj = {
                    ...itemObj,
                    item
                }
            }

            if (!itemObj) return null;

            let currentDate = new Date().toJSON().slice(0, 10);
            const ItemCheck = item.check?.find((check) => check?.checkDate === currentDate);
            const checked: boolean = ItemCheck?.checked === true ? true : false;

            return (
                <div key={`${item.type}-${item.id}-${index}`} className="w-full flex items-center justify-between p-1 mt-1">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            className="accent-[#0082E1] border-primary w-6 h-6 rounded-xl cursor-pointer"
                            checked={checked}
                            onChange={() => {
                                const groupToCheck: itemGroupToCheck = {
                                    routineId: routineId,
                                    ...(item.type === 'task'
                                        ? {
                                            taskGroupDTO: {
                                                taskGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                        : {
                                            habitGroupDTO: {
                                                habitGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                    )
                                };
                                handleCheck(groupToCheck);
                            }}
                        />
                        <span className="text-md text-secondary ml-2">
                            {itemObj.name}
                        </span>
                        <span className="mx-2 text-secondary">-</span>
                        <span className="text-center text-primary text-lg">
                            {formatTimeRange(item.startTime, item.endTime)}
                        </span>

                    </div>
                    {/* <Notify 
                        text={notifyText}
                        open={openNotify}
                        onClose={() => setOpenNotify(false)}
                    /> */}
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col items-start justify-center w-full h-full">
            <div className="flex items-center gap-2">
                {Icon && <span className="text-[30px] text-icon"><Icon /></span>}
                <span className="text-xl font-bold text-primary line-clamp-1">{section.name}
                <span className="ml-4 text-lg text-description">
                        {formatTimeRange(section.startTime, section.endTime)}
                </span>
            </span>

            </div>
    
            <div className="w-full flex flex-col items-start justify-start mb-4 mt-2">
                {renderItems()}
            </div>

        </div>
    )
}
