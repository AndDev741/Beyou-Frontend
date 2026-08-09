import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "@beyou/state/rootReducer";
import deleteRoutine from "@beyou/api/routine/deleteRoutine";
import getRoutines from "@beyou/api/routine/getRoutines";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import { Routine } from "@beyou/types/routine/routine";
import { editModeEnter, routineEnter } from "@beyou/state/routine/editRoutineSlice";
import ScheduleModal from "./ScheduleModal";
import { RoutineCard } from "./RoutineCard";
import { task } from "@beyou/types/tasks/taskType";
import { habit } from "@beyou/types/habit/habitType";
import checkRoutine from "@beyou/api/routine/checkItem";
import skipRoutine from "@beyou/api/routine/skipItem";
import { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";
import { itemGroupToSkip } from "@beyou/types/routine/itemGroupToSkip";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { SnapshotRoutineCard } from "./SnapshotRoutineCard";
import { SnapshotEmptyState } from "./SnapshotEmptyState";
import DeleteModal from "../DeleteModal";
import EmptyState from "../EmptyState";
import { CalendarDays } from "lucide-react";
import { openAgentPanel } from "../agent/agentPanelBus";

type RenderRoutinesProps = {
    selectedDate: string;
    routines?: Routine[];
    onScheduleModalChange?: (isOpen: boolean) => void;
    /** Opens the create form from the empty state. */
    onCreateRoutine?: () => void;
};

export default function RenderRoutines({
    selectedDate,
    routines: routinesOverride,
    onScheduleModalChange,
    onCreateRoutine
}: RenderRoutinesProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const routinesFromStore = useSelector((state: RootState) => state.routines.routines) || [];
    const routines = routinesOverride || routinesFromStore;
    const tasks = useSelector((state: RootState) => state.tasks.tasks) as task[] || [];
    const habits = useSelector((state: RootState) => state.habits.habits) as habit[] || [];

    const snapshotState = useSelector((state: RootState) => state.snapshot) || { snapshots: {}, selectedDate: '', loading: false, snapshotDates: [] };
    const snapshots = snapshotState.snapshots || {};
    const snapshotList = Object.values(snapshots);

    const today = new Date().toISOString().split("T")[0];
    const isSnapshotMode = selectedDate < today && snapshotState.selectedDate === selectedDate;

    const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    const taskLookup = tasks?.reduce<Record<string, { name?: string; iconId?: string }>>((map, taskItem) => {
        map[taskItem.id] = { name: taskItem.name, iconId: taskItem.iconId };
        return map;
    }, {}) || {};

    const habitLookup = habits?.reduce<Record<string, { name?: string; iconId?: string }>>((map, habitItem) => {
        map[habitItem.id] = { name: habitItem.name, iconId: habitItem.iconId };
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

    // Skip existed only on the dashboard routine; the routines page showed the same
    // item with no way out. Same call, same refetch.
    const handleSkip = async (payload: itemGroupToSkip) => {
        const response = await skipRoutine(payload, t, selectedDate);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        const routinesResponse = await getRoutines(t);
        dispatch(enterRoutines(routinesResponse?.success));
    };

    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);

    if (isSnapshotMode) {
        if (snapshotList.length > 0) {
            return (
                <div className="w-full text-text space-y-4">
                    <div className="flex flex-col gap-4">
                        {snapshotList.map((snapshot) => (
                            <SnapshotRoutineCard
                                key={snapshot.id}
                                snapshot={snapshot}
                                routineId={snapshot.routineId}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full text-text space-y-4">
                <SnapshotEmptyState />
            </div>
        );
    }

    return (
        <div className="w-full text-text space-y-4">
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
                            onSkipItem={handleSkip}
                            onRequestDelete={setRoutineToDelete}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<CalendarDays size={20} aria-hidden="true" />}
                    title={t("0RoutinesTitle")}
                    description={t("0RoutinesDescription")}
                    actionLabel={onCreateRoutine ? t("Create routine") : undefined}
                    onAction={onCreateRoutine}
                    secondaryLabel={t("OrAskTheAssistant")}
                    onSecondary={openAgentPanel}
                    testId="no-routines-empty-state"
                />
            )}

            {/* Delete uses the same modal as the other entities — the routine used
                tinha uma confirmação inline própria dentro do cartão. */}
            {routineToDelete && (
                <DeleteModal
                    objectId={routineToDelete.id ?? ""}
                    onDelete={Boolean(routineToDelete)}
                    setOnDelete={(open) => {
                        const next = typeof open === "function" ? open(true) : open;
                        if (!next) setRoutineToDelete(null);
                    }}
                    t={t}
                    name={routineToDelete.name}
                    dispatchFunction={enterRoutines}
                    deleteObject={deleteRoutine}
                    getObjects={getRoutines}
                    deletePhrase={t("ConfirmDeleteOfRoutinePhrase")}
                    mode="routine"
                />
            )}

            {showModal && selectedRoutine && (
                <ScheduleModal routine={selectedRoutine} onClose={handleCloseModal} />
            )}
        </div>
    );
}
