import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import CreateRoutine from "../../components/routines/CreateRoutine";
import getHabits from "@beyou/api/habits/getHabits";
import { useDispatch, useSelector } from "react-redux";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import getTasks from "@beyou/api/tasks/getTasks";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import { Routine as routineType } from "@beyou/types/routine/routine";
import getRoutines from "@beyou/api/routine/getRoutines";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import RenderRoutines from "../../components/routines/renderRoutines";
import { RootState } from "@beyou/state/rootReducer";
import EditDailyRoutine from "../../components/routines/dailyRoutine/EditDailyRoutine";
import { RoutineSummary } from "../../components/routines/RoutineSummary";
import {
    compareNumbers,
    compareStrings,
    sortItems
} from "../../components/utils/sortHelpers";
import useAuthGuard from "../../components/useAuthGuard";
import SpotlightTutorial from "../../components/tutorial/SpotlightTutorial";
import { useRoutinesTutorial } from "../../components/tutorial/hooks/useRoutinesTutorial";
import { getSnapshotsForDay } from "@beyou/api/routine/snapshot";
import {
    clearSnapshot,
    enterSnapshots,
    setSelectedDate,
    setSnapshotLoading,
} from "@beyou/state/routine/snapshotSlice";

import { editModeEnter } from "@beyou/state/routine/editRoutineSlice";
import Modal from "../../components/modals/Modal";
import Button from "../../components/Button";
import { FiPlus } from "react-icons/fi";
const Routine = () => {
    useAuthGuard();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [onCreateRoutine, setOnCreateRoutine] = useState(false);
    const [routineType, setRoutineType] = useState("");
    const [selectedDateLocal, setSelectedDateLocal] = useState(() => new Date().toISOString().split("T")[0]);
    const editMode = useSelector((state: RootState) => state.editRoutine.editMode);
    const routines = useSelector((state: RootState) => state.routines.routines) as routineType[] || [];
    const sortBy = useSelector((state: RootState) => state.viewFilters.routines);
    const snapshotLoading = useSelector((state: RootState) => state.snapshot?.loading ?? false);
    const [hasDailySection, setHasDailySection] = useState(false);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    const today = new Date().toISOString().split("T")[0];
    const isSnapshotMode = selectedDateLocal < today;

    const hasRoutines = routines.length > 0;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayNames[new Date().getDay()];
    const hasScheduleToday = routines.some((routine) =>
        routine.schedule?.days?.includes(todayName)
    );

    const sortedRoutines = useMemo(() => {
        switch (sortBy) {
            case "name-asc":
                return sortItems(routines, (a, b) => compareStrings(a.name, b.name));
            case "name-desc":
                return sortItems(routines, (a, b) => compareStrings(b.name, a.name));
            case "level-desc":
                return sortItems(routines, (a, b) => compareNumbers(b.level, a.level));
            case "level-asc":
                return sortItems(routines, (a, b) => compareNumbers(a.level, b.level));
            case "xp-desc":
                return sortItems(routines, (a, b) => compareNumbers(b.xp, a.xp));
            case "xp-asc":
                return sortItems(routines, (a, b) => compareNumbers(a.xp, b.xp));
            default:
                return routines;
        }
    }, [routines, sortBy]);

    const handleDateChange = useCallback(async (newDate: string) => {
        setSelectedDateLocal(newDate);

        const currentToday = new Date().toISOString().split("T")[0];

        if (newDate >= currentToday) {
            dispatch(clearSnapshot());
            return;
        }

        dispatch(setSelectedDate(newDate));
        dispatch(setSnapshotLoading(true));

        try {
            const dayResult = await getSnapshotsForDay(newDate, t);
            dispatch(enterSnapshots(dayResult.success ?? []));
        } catch (error) {
            console.error("Failed to fetch snapshots:", error);
            dispatch(clearSnapshot());
            dispatch(setSelectedDate(newDate));
        } finally {
            dispatch(setSnapshotLoading(false));
        }
    }, [t, dispatch]);

    useEffect(() => {

        const fetchData = async () => {
            const habits = await getHabits(t);
            const tasks = await getTasks(t);
            const routines = await getRoutines(t);

            dispatch(enterHabits(habits?.success));
            dispatch(enterTasks(tasks?.success));
            dispatch(enterRoutines(routines?.success as routineType[]));
        }

        fetchData();
    }, []);

    useEffect(() => {
        return () => {
            dispatch(clearSnapshot());
        };
    }, [dispatch]);

    const {
        routineSteps,
        routineStep,
        setRoutineStep,
        showRoutineSpotlight,
        onComplete,
        onSkip
    } = useRoutinesTutorial({
        onCreateRoutine,
        routineType,
        hasDailySection,
        isSectionModalOpen,
        isScheduleModalOpen,
        hasRoutines,
        hasScheduleToday
    });

    return (
        <div className="min-h-screen w-full bg-bg px-4 py-6 pb-4 text-text lg:px-7">
            {showRoutineSpotlight && (
                <SpotlightTutorial
                    steps={routineSteps}
                    isActive={showRoutineSpotlight}
                    currentStep={routineStep}
                    onStepChange={setRoutineStep}
                    onComplete={onComplete}
                    onSkip={onSkip}
                />
            )}
            <main className="mt-1 flex min-h-[80vh] flex-col gap-5">
                <RoutineSummary
                    routines={routines}
                    selectedDate={selectedDateLocal}
                    onDateChange={handleDateChange}
                    action={
                        !isSnapshotMode && !onCreateRoutine ? (
                            <Button
                                text={t("Create routine")}
                                mode="primary"
                                size="medium"
                                icon={<FiPlus aria-hidden="true" />}
                                onClick={() => setOnCreateRoutine(true)}
                                testId="create-routine"
                                tutorialId="routine-add-button"
                            />
                        ) : undefined
                    }
                />

                {snapshotLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-transparent" />
                    </div>
                ) : (
                    <RenderRoutines
                        selectedDate={selectedDateLocal}
                        routines={sortedRoutines}
                        onScheduleModalChange={setIsScheduleModalOpen}
                    />
                )}

                {/* Criar e editar acontecem em modal: a lista fica com a largura
                    toda, em vez de dividir a tela com um formulário que só é
                    usado de vez em quando. */}
                {!isSnapshotMode && (onCreateRoutine || editMode) && (
                    <Modal
                        isOpen
                        onClose={() => {
                            setOnCreateRoutine(false);
                            dispatch(editModeEnter(false));
                        }}
                        labelledBy="routine-form-title"
                        dataTutorialId="routine-create-area"
                        className="max-w-3xl"
                    >
                        <h2 id="routine-form-title" className="text-lg font-semibold text-text">
                            {editMode ? t("Edit routine") : t("Create routine")}
                        </h2>
                        <div className="mt-4">
                            {editMode ? (
                                <EditDailyRoutine />
                            ) : (
                                <CreateRoutine
                                    setRoutineType={setRoutineType}
                                    onDailySectionChange={setHasDailySection}
                                    onSectionModalChange={setIsSectionModalOpen}
                                    routineType={routineType}
                                />
                            )}
                        </div>
                    </Modal>
                )}
            </main>
        </div>
    );
};

export default Routine;
