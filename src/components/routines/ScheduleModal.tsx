import { useState } from "react";
import { Routine } from "../../types/routine/routine";
import { useTranslation } from "react-i18next";

interface ScheduleModalProps {
    routine: Routine;
    onClose: () => void;
}

export default function ScheduleModal({ routine, onClose }: ScheduleModalProps) {
    const { t } = useTranslation();
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
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

    const handleSchedule = () => {
        console.log("Scheduled:", { routineName, days: selectedDays });
        onClose();
    };

    const getTranslatedLabel = (key: string) => t(key);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[90%] max-w-md border-2 border-blue-600">
                <h2 className="text-xl font-bold mb-4">{routineName}</h2>

                <div className="w-full flex items-center justify-between">
                    <div className="flex flex-wrap w-[60%]">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                            <div className="flex flex-col items-center justify-center">
                                <button
                                    key={day}
                                    className={`w-[50px] h-[50px] p-2 mx-3 my-1 rounded-full border ${selectedDays.includes(day) ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-gray-100"
                                        }`}
                                    onClick={() => handleDayToggle(day)}
                                >

                                </button>
                                <p>{getTranslatedLabel(day)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="w-[30%] flex flex-col items-center justify-evenly">
                        <button className={`px-4 py-2 my-2 border border-blueMain  rounded  ${handleBgColor.includes(1) ? "bg-blueMain text-white" : "bg-white text-blueMain hover:bg-gray-100"}`}
                            onClick={() => handleDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], 1)}
                        >
                            {t('Mon - Fri')}
                        </button>
                        <button className={`px-4 py-2 my-2 border border-blueMain  rounded  ${handleBgColor.includes(2) ? "bg-blueMain text-white" : "bg-white text-blueMain hover:bg-gray-100"}`}
                            onClick={() => handleDays(["Saturday", "Sunday"], 2)}
                        >
                            {t('Weekend')}
                        </button>
                        <button className={`px-4 py-2 my-2 border border-blueMain  rounded  ${handleBgColor.includes(3) ? "bg-blueMain text-white" : "bg-white text-blueMain hover:bg-gray-100"}`}
                            onClick={() => handleDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], 3)}
                        >
                            {t('All week')}
                        </button>
                    </div>
                </div>

                <div className="flex justify-evenly mt-6">
                    <button
                        className="px-4 py-2 bg-blueMain text-white rounded hover:opacity-95"
                        onClick={() => {
                            handleSchedule();
                        }}
                    >
                        {t("Schedule")}
                    </button>
                    <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={onClose}>
                        {t('Cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}