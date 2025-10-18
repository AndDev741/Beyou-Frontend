import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../../../../redux/rootReducer";
import HabitOrTaskGroup from "./HabitOrTaskGroup";
import { useDragScroll } from "../../../../hooks/useDragScroll";
import { RoutineSection } from "../../../../types/routine/routineSection";
import { useState } from "react";
interface TaskSelectorProps {
    setRoutineSection?: React.Dispatch<React.SetStateAction<RoutineSection[]>>;
    index: number;
    section: RoutineSection;
    setOpenTaskSelector?: React.Dispatch<React.SetStateAction<boolean>>;
}

const TaskAndHabitSelector = ({ setRoutineSection, index, section, setOpenTaskSelector }: TaskSelectorProps) => {
    const { t } = useTranslation();
    const habits = useSelector((state: RootState) => state.habits.habits);
    const tasks = useSelector((state: RootState) => state.tasks.tasks);
    const [startTime, setStartTime] = useState<string>("");

    const habitScroll = useDragScroll();
    const taskScroll = useDragScroll();

    console.log(habits)
    console.log(tasks)
    return (
        <div className="flex flex-col items-center justify-start w-full border-2 border-primary rounded-lg p-2 mt-2 bg-background text-secondary shadow-sm transition-colors duration-200">

            <div className="w-full flex flex-col items-start justify-evenly">
                <div className="flex flex-col items-center justify-start w-full my-1 mx-2">
                    <h2 className="font-medium text-secondary">{t("Put the start time of this item")}</h2>
                    <p className="text-sm text-center text-description">{t('Need to fit between the section time')}</p>
                    <input
                        type="time"
                        className="border-2 border-primary rounded-lg p-1 mt-1 font-medium bg-background text-secondary transition-colors duration-200 color-scheme"
                        min={section.startTime}
                        max={section.endTime}
                        value={startTime}
                        onChange={(e) => {
                            const newTime = e.target.value;
                            if (newTime < section.startTime) {
                                setStartTime(section.startTime);
                                return;
                            } else if(newTime > section.endTime) {
                                setStartTime(section.endTime);
                            }
                            
                            else {
                                setStartTime(newTime);
                            }
                        }}
                    />
                </div>

                <div className="w-full flex overflow-auto items-start gap-2 justify-start"
                    ref={habitScroll.ref}
                    onMouseDown={habitScroll.onMouseDown}
                    onMouseLeave={habitScroll.onMouseLeave}
                    onMouseUp={habitScroll.onMouseUp}
                    onMouseMove={habitScroll.onMouseMove}
                    onTouchStart={habitScroll.onTouchStart}
                    onTouchMove={habitScroll.onTouchMove}
                >
                    {habits.map((habit) => (
                        <HabitOrTaskGroup
                            habit={habit}
                            key={habit.id}
                            setRoutineSection={setRoutineSection!}
                            index={index}
                            setOpenTaskSelector={setOpenTaskSelector!}
                            startTime={startTime}
                            section={section}
                        />
                    ))}
                </div>

                <div className="w-full flex overflow-auto items-start gap-2 justify-start"
                    ref={taskScroll.ref}
                    onMouseDown={taskScroll.onMouseDown}
                    onMouseLeave={taskScroll.onMouseLeave}
                    onMouseUp={taskScroll.onMouseUp}
                    onMouseMove={taskScroll.onMouseMove}
                    onTouchStart={taskScroll.onTouchStart}
                    onTouchMove={taskScroll.onTouchMove}
                >
                    {tasks.map((task) => (
                        <HabitOrTaskGroup
                            task={task}
                            key={task.id}
                            setRoutineSection={setRoutineSection!}
                            index={index}
                            setOpenTaskSelector={setOpenTaskSelector!}
                            startTime={startTime}
                            section={section}
                        />
                    ))}
                </div>

                {habits.length === 0 && tasks.length === 0 && (
                    <span className="text-description">{t("No habits or task available, create one")}</span>
                )}

            </div>
        </div>
    );
};

export default TaskAndHabitSelector;
