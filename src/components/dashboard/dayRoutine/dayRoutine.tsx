import { useTranslation } from "react-i18next";
import { Routine } from "../../../types/routine/routine";
import RoutineSection from "./routineSection";

export default function RoutineDay({routine}: {routine: Routine | null}) {
    const {t} = useTranslation();
    if (routine !== null) {
        return (
            <div className="flex flex-col w-full items-center justify-center h-full">
                <h1 className="text-2xl font-bold mb-4 lg:hidden">{t('Daily Routine')}</h1>
                <div className="flex flex-col items-center lg:items-start border border-blueMain rounded-md p-4 w-[90%]">
                    <h2 className="text-2xl font-semibold mb-2 lg:mb-4">
                        {routine.name}
                    </h2>

                    {routine.routineSections?.map((section, index) => (
                        <RoutineSection key={index} section={section} routineId={routine.id!} />
                    ))}
                </div>
            </div>
        );
    } else {
        return <h2 className="text-center mt-12 text-2xl text-blueMain font-semibold">
            {t('No Routines Scheduled for today')}
        </h2>;
    }
}