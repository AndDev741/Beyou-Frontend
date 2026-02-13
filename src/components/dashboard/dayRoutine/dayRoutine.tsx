import { useTranslation } from "react-i18next";
import { Routine } from "../../../types/routine/routine";
import RoutineSection from "./routineSection";

export default function RoutineDay({ routine }: { routine: Routine | null }) {
    const { t } = useTranslation();

    if (routine !== null) {
        return (
            <div
                className="flex flex-col w-full items-center justify-center h-full mt-2.5"
                data-tutorial-id="dashboard-routine-today"
            >
                <div className="flex flex-col items-center lg:items-start border border-primary rounded-md p-4 w-[97%]">
                    <h2 className="text-2xl font-semibold mb-2 lg:mb-4 text-secondary w-full text-center lg:text-left">
                        {routine.name}
                    </h2>

                    {routine.routineSections?.map((section, index) => (
                        <RoutineSection key={index} section={section} routineId={routine.id!} />
                    ))}
                </div>
            </div>
        );
    } else {
        return (
            <h2
                className="text-center mt-12 text-2xl text-description font-semibold"
                data-tutorial-id="dashboard-routine-today"
            >
                {t('No Routines Scheduled for today')}
            </h2>
        );
    }
}
