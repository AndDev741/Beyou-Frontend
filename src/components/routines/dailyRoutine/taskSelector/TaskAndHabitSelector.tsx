import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../../../../redux/rootReducer";
import HabitOrTaskGroup from "./HabitOrTaskGroup";
import { useDragScroll } from "../../../../hooks/useDragScroll";
import { RoutineSection } from "../../../../types/routine/routineSection";
import { useState } from "react";
import { getItemTimeErrorKeys, getSectionErrorKeys, isOvernightRange, ITEM_TIME_TOLERANCE_MINUTES } from "../routineValidation";
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
    const [endTime, setEndTime] = useState<string>("");

    const isOvernight = isOvernightRange(section.startTime, section.endTime);

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

    const minStart = !isOvernight && section.startTime ? addMinutes(section.startTime, -ITEM_TIME_TOLERANCE_MINUTES) : undefined;
    const maxEnd = !isOvernight && section.endTime ? addMinutes(section.endTime, ITEM_TIME_TOLERANCE_MINUTES) : undefined;

    const habitScroll = useDragScroll();
    const taskScroll = useDragScroll();

    console.log(habits)
    console.log(tasks)
    const sectionErrors = getSectionErrorKeys(section.name, section.startTime);
    const itemTimeErrors = getItemTimeErrorKeys(section.startTime, section.endTime, startTime, endTime);
    const blockingErrors = [...sectionErrors, ...itemTimeErrors];
    const errorMessage = blockingErrors.length > 0 ? t(blockingErrors[0]) : "";
    const isAddBlocked = blockingErrors.length > 0;

    return (
        <div className="flex flex-col items-center justify-start w-full border-2 border-primary rounded-lg p-2 mt-2 bg-background text-secondary shadow-sm transition-colors duration-200">

            <div className="w-full flex flex-col items-start justify-evenly">
                <div className="flex flex-col items-center justify-start w-full my-1 mx-2">
                    <h2 className="font-medium text-secondary">{t("Put the start and end time of this item")}</h2>
                    <p className="text-sm text-center text-description">{t('Need to fit between the section time')}</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <input
                            type="time"
                            className={`border-2 rounded-lg p-1 mt-1 font-medium bg-background text-secondary transition-colors duration-200 color-scheme ${itemTimeErrors.length > 0 ? "border-error" : "border-primary"}`}
                            min={minStart}
                            max={maxEnd}
                            value={startTime}
                            onChange={(e) => {
                                const newTime = e.target.value;
                                setStartTime(newTime);
                                if (!isOvernight && endTime && newTime && endTime < newTime) {
                                    setEndTime(newTime);
                                }
                            }}
                        />
                        <input
                            type="time"
                            className={`border-2 rounded-lg p-1 mt-1 font-medium bg-background text-secondary transition-colors duration-200 color-scheme ${itemTimeErrors.length > 0 ? "border-error" : "border-primary"}`}
                            min={!isOvernight ? startTime || minStart : undefined}
                            max={maxEnd}
                            value={endTime}
                            onChange={(e) => {
                                const newTime = e.target.value;
                                setEndTime(newTime);
                            }}
                        />
                    </div>
                    {errorMessage && (
                        <p className="text-error text-sm mt-1 text-center">{errorMessage}</p>
                    )}
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
                            endTime={endTime}
                            section={section}
                            disabled={isAddBlocked}
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
                            endTime={endTime}
                            section={section}
                            disabled={isAddBlocked}
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
