import { useState } from "react";
import { Routine } from "../../types/routine/routine";
import { useTranslation } from "react-i18next";
import createSchedule from "../../services/schedule/createSchedule";
import { useDispatch } from "react-redux";
import getRoutines from "../../services/routine/getRoutines";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import editSchedule from "../../services/schedule/editSchedule";

interface ScheduleModalProps {
    routine: Routine;
    onClose: () => void;
}

export default function ScheduleModal({ routine, onClose }: ScheduleModalProps) {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [selectedDays, setSelectedDays] = useState<string[]>(routine?.schedule?.days || []);
    const [routineName, setRoutineName] = useState(routine.name);
    const [handleBgColor, setHandleBgColor] = useState<number[]>([]);

    const dayMapping: { [key: string]: string } = {
        "Monday": t("Monday"),
        "Tuesday": t("Tuesday"),
        "Wednesday": t("Wednesday"),
        "Thursday": t("Thursday"),
        "Friday": t("Friday"),
        "Saturday": t("Saturday"),
        "Sunday": t("Sunday"),
    };

    const reverseDayMapping: { [key: string]: string } = Object.fromEntries(
        Object.entries(dayMapping).map(([key, value]) => [value, key])
    );

    const handleDayToggle = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const handleDays = (days: string[], buttonId: number) => {
        const allDaysPresent = days.every((day) => selectedDays.includes(day));
        let newSelectedDays: string[];
        let newBgColor: number[];

        if (allDaysPresent) {
            newSelectedDays = selectedDays.filter((day) => !days.includes(day));
            newBgColor = handleBgColor.filter((id) => id !== buttonId);
        } else {
            newSelectedDays = [...selectedDays.filter((day) => !days.some((d) => d === day)), ...days];
            newBgColor = [...handleBgColor.filter((id) => id !== buttonId), buttonId];
        }

        setSelectedDays(newSelectedDays);
        setHandleBgColor(newBgColor);
    };

    const handleSchedule = async () => {
        console.log("Scheduled:", { routineName, days: selectedDays });

        const scheduleId = routine.schedule?.id || "";
        if (!scheduleId) {
            const scheduleSaved = await createSchedule(selectedDays, routine.id!, t);
            console.log("Schedule saved:", scheduleSaved);
        }
        else {
            const scheduleUpdated = await editSchedule(scheduleId, selectedDays, routine.id!, t);
            console.log("Schedule updated:", scheduleUpdated);
        }
        const routines = await getRoutines(t);
        console.log("Routines fetched:", routines);
        dispatch(enterRoutines(routines.success));
        onClose();
    };

    const getTranslatedLabel = (key: string) => t(key);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-[90%] max-w-md border-2 border-primary text-secondary transition-colors duration-200">
                <h2 className="text-xl font-bold mb-4 text-secondary">{routineName}</h2>

                <div className="w-full flex items-center justify-between">
                    <div className="flex flex-wrap w-[60%]">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                            <div className="flex flex-col items-center justify-center" key={day}>
                                <button
                                    className={`w-[50px] h-[50px] p-2 mx-3 my-1 rounded-full border-[2px] border-primary transition-colors duration-200 ${selectedDays.includes(day) ? "bg-primary text-background dark:text-secondary" : "bg-background text-primary hover:bg-primary/10"
                                        }`}
                                    onClick={() => handleDayToggle(day)}
                                >

                                </button>
                                <p className="text-description mt-1">{getTranslatedLabel(day)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="w-[30%] flex flex-col items-center justify-evenly">
                        <button className={`px-4 py-2 my-2 border border-primary rounded transition-colors duration-200 ${handleBgColor.includes(1) ? "bg-primary text-background dark:text-secondary" : "bg-background text-primary hover:bg-primary/10"}`}
                            onClick={() => handleDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], 1)}
                        >
                            {t('Mon - Fri')}
                        </button>
                        <button className={`px-4 py-2 my-2 border border-primary rounded transition-colors duration-200 ${handleBgColor.includes(2) ? "bg-primary text-background dark:text-secondary" : "bg-background text-primary hover:bg-primary/10"}`}
                            onClick={() => handleDays(["Saturday", "Sunday"], 2)}
                        >
                            {t('Weekend')}
                        </button>
                        <button className={`px-4 py-2 my-2 border border-primary rounded transition-colors duration-200 ${handleBgColor.includes(3) ? "bg-primary text-background dark:text-secondary" : "bg-background text-primary hover:bg-primary/10"}`}
                            onClick={() => handleDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], 3)}
                        >
                            {t('All week')}
                        </button>
                    </div>
                </div>

                <div className="flex justify-evenly mt-6">
                    <button
                        className="px-4 py-2 bg-primary text-background dark:text-secondary rounded hover:bg-primary/90 transition-colors duration-200"
                        onClick={() => {
                            handleSchedule();
                        }}
                    >
                        {t("Schedule")}
                    </button>
                    <button className="px-4 py-2 bg-secondary/20 text-secondary rounded hover:bg-secondary/30 transition-colors duration-200" onClick={onClose}>
                        {t('Cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}
