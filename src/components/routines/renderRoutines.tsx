import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../../redux/rootReducer";
import deleteRoutine from "../../services/routine/deleteRoutine";
import getRoutines from "../../services/routine/getRoutines";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import { Routine } from "../../types/routine/routine";
import { editModeEnter, routineEnter } from "../../redux/routine/editRoutineSlice";
import ScheduleModal from "./ScheduleModal";
import { RoutineCard } from "./RoutineCard";
import { task } from "../../types/tasks/taskType";
import { habit } from "../../types/habit/habitType";
import checkRoutine from "../../services/routine/checkItem";
import { itemGroupToCheck } from "../../types/routine/itemGroupToCheck";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";

type RenderRoutinesProps = {
    selectedDate: string;
    routines?: Routine[];
    onScheduleModalChange?: (isOpen: boolean) => void;
};

export default function RenderRoutines({
    selectedDate,
    routines: routinesOverride,
    onScheduleModalChange
}: RenderRoutinesProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const routinesFromStore = useSelector((state: RootState) => state.routines.routines) || [];
    const routines = routinesOverride || routinesFromStore;
    const tasks = useSelector((state: RootState) => state.tasks.tasks) as task[] || [];
    const habits = useSelector((state: RootState) => state.habits.habits) as habit[] || [];

    const [confirmDelete, setConfirmDelete] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    console.log("HABITS => ", habits);

    const taskLookup = tasks?.reduce<Record<string, { name?: string; iconId?: string }>>((map, taskItem) => {
        map[taskItem.id] = { name: taskItem.name, iconId: taskItem.iconId };
        return map;
    }, {}) || {};

    const habitLookup = habits?.reduce<Record<string, { name?: string; iconId?: string }>>((map, habitItem) => {
        map[habitItem.id] = { name: habitItem.name, iconId: habitItem.iconId };
        console.log("MAP => ", map)
        return map;
    }, {}) || {};

    const handleSchedule = (routine: Routine) => {
        setSelectedRoutine(routine);
        setShowModal(true);
        onScheduleModalChange?.(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        onScheduleModalChange?.(false);
    };

    const handleDelete = async (id: string) => {
        const response = await deleteRoutine(id, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        const routinesResponse = await getRoutines(t);
        dispatch(enterRoutines(routinesResponse?.success));
        setConfirmDelete("");
        toast.success(t("deleted successfully"));
    };

    const handleEdit = (routine: Routine) => {
        dispatch(routineEnter(routine));
        dispatch(editModeEnter(true));
    };

    const handleCheck = async (payload: itemGroupToCheck) => {
        const response = await checkRoutine(payload, t, selectedDate);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        const routinesResponse = await getRoutines(t);
        dispatch(enterRoutines(routinesResponse?.success));
    };

    useEffect(() => {
        dispatch(editModeEnter(false));
    }, [])

    return (
        <div className="w-full text-secondary space-y-4">
            {routines.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {routines.map((routine: Routine) => (
                        <RoutineCard
                            key={routine.id}
                            routine={routine}
                            selectedDate={selectedDate}
                            taskLookup={taskLookup}
                            habitLookup={habitLookup}
                            onEdit={handleEdit}
                            onSchedule={handleSchedule}
                            onCheckItem={handleCheck}
                            onRequestDelete={(id) => setConfirmDelete(id)}
                            onConfirmDelete={handleDelete}
                            onCancelDelete={() => setConfirmDelete("")}
                            isConfirmingDelete={confirmDelete === routine.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-background p-8 text-center shadow-sm">
                    <p className="text-lg font-semibold">{t("No routines available, start create some to track you tasks!")}</p>
                    <p className="mt-2 text-sm text-description">{t("Create your first routine to see it here")}</p>
                </div>
            )}

            {showModal && selectedRoutine && (
                <ScheduleModal routine={selectedRoutine} onClose={handleCloseModal} />
            )}
        </div>
    );
}
