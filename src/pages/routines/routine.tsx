import { useTranslation } from "react-i18next";
import Header from "../../components/header";
import AddRoutineButton from "../../components/routines/addRoutineButton";
import { useEffect, useMemo, useState } from "react";
import CreateRoutine from "../../components/routines/CreateRoutine";
import getHabits from "../../services/habits/getHabits";
import { useDispatch, useSelector } from "react-redux";
import { enterHabits } from "../../redux/habit/habitsSlice";
import getTasks from "../../services/tasks/getTasks";
import { enterTasks } from "../../redux/task/tasksSlice";
import { Routine as routineType } from "../../types/routine/routine";
import getRoutines from "../../services/routine/getRoutines";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import RenderRoutines from "../../components/routines/renderRoutines";
import { RootState } from "../../redux/rootReducer";
import EditDailyRoutine from "../../components/routines/dailyRoutine/EditDailyRoutine";
import { CgAddR } from "react-icons/cg";
import { RoutineSummary } from "../../components/routines/RoutineSummary";
import SortFilterBar, { SortOption } from "../../components/filters/SortFilterBar";
import {
    compareNumbers,
    compareStrings,
    sortItems
} from "../../components/utils/sortHelpers";
import { setViewSort } from "../../redux/viewFilters/viewFiltersSlice";
import useAuthGuard from "../../components/useAuthGuard";
import SpotlightTutorial, { SpotlightStep } from "../../components/tutorial/SpotlightTutorial";
import { clearTutorialPhase, getTutorialPhase, setTutorialPhase, type TutorialPhase } from "../../components/tutorial/tutorialStorage";
import editUser from "../../services/user/editUser";
import { tutorialCompletedEnter } from "../../redux/user/perfilSlice";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";
import { useNavigate } from "react-router-dom";

const Routine = () => {
    useAuthGuard();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [onCreateRoutine, setOnCreateRoutine] = useState(false);
    const [routineType, setRoutineType] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const editMode = useSelector((state: RootState) => state.editRoutine.editMode);
    const routines = useSelector((state: RootState) => state.routines.routines) as routineType[] || [];
    const sortBy = useSelector((state: RootState) => state.viewFilters.routines);
    const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);
    const [tutorialPhase, setTutorialPhaseState] = useState<TutorialPhase | null>(() => getTutorialPhase());
    const [routineStep, setRoutineStep] = useState(0);
    const [hasDailySection, setHasDailySection] = useState(false);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const navigate = useNavigate();

    const hasRoutines = routines.length > 0;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayNames[new Date().getDay()];
    const hasScheduleToday = routines.some((routine) =>
        routine.schedule?.days?.includes(todayName)
    );

    const sortOptions: SortOption[] = [
        { value: "default", label: t("Default order") },
        { value: "name-asc", label: t("Name (A-Z)") },
        { value: "name-desc", label: t("Name (Z-A)") },
        { value: "level-desc", label: t("Level (High to Low)") },
        { value: "level-asc", label: t("Level (Low to High)") },
        { value: "xp-desc", label: t("XP (High to Low)") },
        { value: "xp-asc", label: t("XP (Low to High)") }
    ];

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

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "routines", sortBy: value }));
    };

    useEffect(() => {

        const fetchData = async () => {
            console.log("Fetching habits and tasks...");
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
        if (isTutorialCompleted) {
            clearTutorialPhase();
            setTutorialPhaseState(null);
            return;
        }
        if (!tutorialPhase) {
            setTutorialPhase("intro");
            setTutorialPhaseState("intro");
            return;
        }
        if (tutorialPhase === "routines-dashboard") {
            setTutorialPhase("routines");
            setTutorialPhaseState("routines");
        }
    }, [isTutorialCompleted, tutorialPhase]);

    const completeTutorial = async () => {
        const response = await editUser({ isTutorialCompleted: true });
        if (response.error) {
            const message = getFriendlyErrorMessage(t, response.error);
            toast.error(message);
            return;
        }
        dispatch(tutorialCompletedEnter(true));
        clearTutorialPhase();
        setTutorialPhaseState(null);
    };

    const routineFormStep: SpotlightStep = routineType === "daily"
        ? {
            id: "routine-form",
            targetSelector: "[data-tutorial-id='routine-daily-form']",
            titleKey: "TutorialSpotlightRoutineDailyFormTitle",
            descriptionKey: "TutorialSpotlightRoutineDailyFormDescription",
            position: "left",
            disableNext: !hasDailySection
        }
        : {
            id: "routine-form",
            targetSelector: "[data-tutorial-id='routine-create-area']",
            titleKey: "TutorialSpotlightRoutineFormTitle",
            descriptionKey: "TutorialSpotlightRoutineFormDescription",
            position: "left",
            disableNext: !hasRoutines
        };

    const routineSteps: SpotlightStep[] = useMemo(() => {
        const steps: SpotlightStep[] = [
            {
                id: "create-routine",
                targetSelector: "[data-tutorial-id='routine-add-button']",
                titleKey: "TutorialSpotlightCreateRoutineTitle",
                descriptionKey: "TutorialSpotlightCreateRoutineDescription",
                position: "right",
                action: "click"
            },
            routineFormStep
        ];

        if (routineType === "daily") {
            steps.push({
                id: "routine-section-modal",
                targetSelector: "[data-tutorial-id='routine-section-modal']",
                titleKey: "TutorialSpotlightRoutineSectionModalTitle",
                descriptionKey: "TutorialSpotlightRoutineSectionModalDescription",
                position: "right",
                disableNext: !hasDailySection
            });
        }

        steps.push(
            {
                id: "routine-section",
                targetSelector: "[data-tutorial-id='routine-section-item']",
                titleKey: "TutorialSpotlightRoutineSectionTitle",
                descriptionKey: "TutorialSpotlightRoutineSectionDescription",
                position: "bottom"
            },
            {
                id: "routine-schedule",
                targetSelector: "[data-tutorial-id='routine-schedule-button']",
                titleKey: "TutorialSpotlightRoutineScheduleTitle",
                descriptionKey: "TutorialSpotlightRoutineScheduleDescription",
                position: "bottom",
                disableNext: !hasScheduleToday
            },
            {
                id: "routine-schedule-modal",
                targetSelector: "[data-tutorial-id='routine-schedule-modal']",
                titleKey: "TutorialSpotlightRoutineScheduleModalTitle",
                descriptionKey: "TutorialSpotlightRoutineScheduleModalDescription",
                position: "right",
                disableNext: !hasScheduleToday
            }
        );

        return steps;
    }, [routineFormStep, routineType, hasDailySection, hasScheduleToday]);

    const getStepIndex = (id: string) => routineSteps.findIndex((step) => step.id === id);

    const showRoutineSpotlight = !isTutorialCompleted && tutorialPhase === "routines";

    useEffect(() => {
        if (tutorialPhase !== "routines") return;
        if (isScheduleModalOpen) {
            const modalIndex = getStepIndex("routine-schedule-modal");
            if (modalIndex >= 0) {
                setRoutineStep(modalIndex);
            }
            return;
        }
        if (hasScheduleToday) {
            setTutorialPhase("routines-summary");
            setTutorialPhaseState("routines-summary");
            navigate("/dashboard");
            return;
        }
        if (hasRoutines) {
            const scheduleIndex = getStepIndex("routine-schedule");
            if (scheduleIndex >= 0) {
                setRoutineStep(scheduleIndex);
            }
            return;
        }
        if (routineType === "daily" && hasDailySection) {
            const sectionIndex = getStepIndex("routine-section");
            if (sectionIndex >= 0) {
                setRoutineStep(sectionIndex);
            }
            return;
        }
        if (routineType === "daily" && isSectionModalOpen) {
            const modalIndex = getStepIndex("routine-section-modal");
            if (modalIndex >= 0) {
                setRoutineStep(modalIndex);
            }
            return;
        }
        if (onCreateRoutine) {
            const formIndex = getStepIndex("routine-form");
            if (formIndex >= 0) {
                setRoutineStep(formIndex);
            }
            return;
        }
        const startIndex = getStepIndex("create-routine");
        setRoutineStep(startIndex >= 0 ? startIndex : 0);
    }, [tutorialPhase, onCreateRoutine, hasRoutines, hasScheduleToday, routineType, hasDailySection, isSectionModalOpen, isScheduleModalOpen, navigate, routineSteps]);

    return (
        <div className="bg-background text-secondary min-h-screen pb-4">
            {showRoutineSpotlight && (
                <SpotlightTutorial
                    steps={routineSteps}
                    isActive={showRoutineSpotlight}
                    currentStep={routineStep}
                    onStepChange={setRoutineStep}
                    onComplete={completeTutorial}
                    onSkip={completeTutorial}
                />
            )}
            <Header pageName="Your Routines" />
            <main className="flex flex-col gap-6 min-h-[80vh] mt-4 mx-2 md:mx-4">
                <RoutineSummary
                    routines={routines}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />

                <div className="flex flex-col lg:flex-row items-center lg:items-start justify-start lg:justify-between gap-6">
                    <div className="w-full lg:w-[50%]">
                        <SortFilterBar
                            title={t("Routines list")}
                            description={t("Sort results")}
                            options={sortOptions}
                            value={sortBy}
                            onChange={handleSortChange}
                            quickValues={["name-asc", "level-desc", "xp-desc"]}
                            className="mb-4"
                        />
                        <RenderRoutines
                            selectedDate={selectedDate}
                            routines={sortedRoutines}
                            onScheduleModalChange={setIsScheduleModalOpen}
                        />
                    </div>

                    <div className="w-full flex lg:w-[50%] lg:flex flex-col items-center justify-center">
                        {editMode === false ? (
                            <>
                                <AddRoutineButton
                                    setOnCreateRoutine={setOnCreateRoutine}
                                    setRoutineType={setRoutineType}
                                />

                                {onCreateRoutine && (
                                    <div className='flex items-center mt-6'>
                                        <CgAddR className='w-[30px] h-[30px] mr-1' />
                                        <h1 className='text-3xl font-semibold text-secondary'>{t("Create routine")}</h1>
                                    </div>
                                )}

                                {onCreateRoutine && (
                                    <div className="mt-4 w-full">
                                        <CreateRoutine
                                            setRoutineType={setRoutineType}
                                            onDailySectionChange={setHasDailySection}
                                            onSectionModalChange={setIsSectionModalOpen}
                                            routineType={routineType} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <EditDailyRoutine />
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Routine;
