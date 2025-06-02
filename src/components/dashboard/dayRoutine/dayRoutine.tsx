import { Routine } from "../../../types/routine/routine";
import RoutineSection from "./routineSection";

export default function RoutineDay({routine}: {routine: Routine | null}) {
    if (routine !== null) {
        return (
            <div className="flex flex-col w-full items-center justify-center h-full">
                <h1 className="text-2xl font-bold mb-4 lg:hidden">Daily Routine</h1>
                <div className="flex flex-col items-center lg:items-start border border-blueMain rounded-md p-4 w-[90%]">
                    <h2 className="text-2xl font-semibold mb-2 lg:mb-4">
                        {routine.name}
                    </h2>

                    {routine.routineSections.map((section, index) => (
                        <RoutineSection key={index} section={section} />
                    ))}
                </div>
            </div>
        );
    } else {
        return null;
    }
}