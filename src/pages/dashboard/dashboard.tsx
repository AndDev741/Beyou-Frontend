import { useSelector } from "react-redux";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { enterHabits } from "../../redux/habit/habitsSlice";
import getTasks from "../../services/tasks/getTasks";
import { enterTasks } from "../../redux/task/tasksSlice";
import getHabits from "../../services/habits/getHabits";
import getTodayRoutine from "../../services/routine/getTodayRoutine";
import { enterTodayRoutine } from "../../redux/routine/todayRoutineSlice";
import GoalsTab from "../../components/dashboard/goalsView/goalsTab";
import getGoals from "../../services/goals/getGoals";
import { enterGoals } from "../../redux/goal/goalsSlice";
import isItemChecked from "../../components/utils/verifyIfAItemItsChecked";
import getCategories from "../../services/categories/getCategories";
import WidgetsFabric, { WidgetProps } from "../../components/widgets/utils/widgetsFabric";
import { checkedItemsInScheduledRoutineEnter, totalItemsInScheduledRoutineEnter, tutorialCompletedEnter } from "../../redux/user/perfilSlice";
import { enterCategories } from "../../redux/category/categoriesSlice";
import useChangeLanguage from "../../hooks/useChangeLanguage";
import OnboardingTutorial from "../../components/tutorial/OnboardingTutorial";
import SpotlightTutorial, { SpotlightStep } from "../../components/tutorial/SpotlightTutorial";
import { clearTutorialPhase, getTutorialPhase, setTutorialPhase, type TutorialPhase } from "../../components/tutorial/tutorialStorage";
import editUser from "../../services/user/editUser";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";
import { useNavigate } from "react-router-dom";

function Dashboard() {
    useAuthGuard();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const widgetsIdsInUse = useSelector((state: RootState) => state.perfil.widgetsIdsInUse);
    const constance = useSelector((state: RootState) => state.perfil.constance);
    const categories = useSelector((state: RootState) => state.categories.categories);
    const categoryWithMoreXp = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        return categories.reduce((prev, current) => (prev.xp > current.xp ? prev : current));
    }, [categories]);
    const categoryWithLessXp = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        return categories.reduce((prev, current) => (prev.xp < current.xp ? prev : current));
    }, [categories]);
    const checkedItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.checkedItemsInScheduledRoutine);
    const totalItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.totalItemsInScheduledRoutine);
    const xp = useSelector((state: RootState) => state.perfil.xp);
    const level = useSelector((state: RootState) => state.perfil.level);
    const nextLevelXp = useSelector((state: RootState) => state.perfil.nextLevelXp);
    const actualLevelXp = useSelector((state: RootState) => state.perfil.actualLevelXp);
    const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);
    const [tutorialPhase, setTutorialPhaseState] = useState<TutorialPhase | null>(() => getTutorialPhase());
    const navigate = useNavigate();

    const languageInUse = useSelector((state: RootState) => state.perfil.languageInUse);
    console.log("Language in use => ", languageInUse)
    useChangeLanguage(languageInUse);
    
    useEffect(() => {
        const fetchRoutines = async () => {
            const todayRoutine = await getTodayRoutine(t);
            dispatch(enterTodayRoutine(todayRoutine.success));

            const habits = await getHabits(t);
            dispatch(enterHabits(habits.success));

            const tasks = await getTasks(t);
            dispatch(enterTasks(tasks.success));

            const goals = await getGoals(t);
            dispatch(enterGoals(goals.success));

            const categories = await getCategories(t);
            dispatch(enterCategories(categories.success));
        }
        fetchRoutines();
    }, [dispatch, t])

    useEffect(() => {
        if (!routine) return;

        let checkedCount = 0;
        let totalCount = 0;

        routine.routineSections.forEach(section => {
            section?.habitGroup?.forEach(habitGroup => {
                if (isItemChecked({ habitGroup })) {
                    checkedCount++;
                }
                totalCount++;
            });

            section?.taskGroup?.forEach(taskGroup => {
                if (isItemChecked({ taskGroup })) {
                    checkedCount++;
                }
                totalCount++;
            });
        });

        // Atualiza apenas uma vez
        dispatch(checkedItemsInScheduledRoutineEnter(checkedCount));
        dispatch(totalItemsInScheduledRoutineEnter(totalCount));

    }, [routine]);

    useEffect(() => {
        if (isTutorialCompleted) {
            clearTutorialPhase();
            setTutorialPhaseState(null);
            return;
        }
        if (!tutorialPhase) {
            setTutorialPhase("intro");
            setTutorialPhaseState("intro");
        }
    }, [isTutorialCompleted, tutorialPhase]);

    useEffect(() => {
        if (tutorialPhase === "intro") {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [tutorialPhase]);

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

    const startDashboardSpotlight = () => {
        setTutorialPhase("dashboard");
        setTutorialPhaseState("dashboard");
    };

    const completeDashboardSpotlight = () => {
        setTutorialPhase("categories");
        setTutorialPhaseState("categories");
        navigate("/categories");
    };

    const completeHabitsDashboardSpotlight = () => {
        setTutorialPhase("habits");
        setTutorialPhaseState("habits");
        navigate("/habits");
    };

    const dashboardSteps: SpotlightStep[] = [
        {
            id: "profile",
            targetSelector: "[data-tutorial-id='dashboard-profile']",
            titleKey: "TutorialSpotlightProfileTitle",
            descriptionKey: "TutorialSpotlightProfileDescription",
            position: "bottom"
        },
        {
            id: "shortcuts",
            targetSelector: "[data-tutorial-id='dashboard-shortcuts']",
            titleKey: "TutorialSpotlightShortcutsTitle",
            descriptionKey: "TutorialSpotlightShortcutsDescription",
            position: "right"
        },
        {
            id: "categories-shortcut",
            targetSelector: "[data-tutorial-id='shortcut-categories']",
            titleKey: "TutorialSpotlightCategoriesTitle",
            descriptionKey: "TutorialSpotlightCategoriesDescription",
            position: "right",
            action: "click"
        }
    ];

    const showIntroModal = tutorialPhase === "intro";
    const showDashboardSpotlight = tutorialPhase === "dashboard";
    const showHabitsDashboardSpotlight =
        tutorialPhase === "habits-dashboard" || tutorialPhase === "habits";

    const habitsDashboardSteps: SpotlightStep[] = [
        {
            id: "habits-shortcut",
            targetSelector: "[data-tutorial-id='shortcut-habits']",
            titleKey: "TutorialSpotlightHabitsTitle",
            descriptionKey: "TutorialSpotlightHabitsDescription",
            position: "right",
            action: "click"
        }
    ];

    return (
        <>
            {showIntroModal && (
                <OnboardingTutorial
                    onComplete={startDashboardSpotlight}
                    onSkip={completeTutorial}
                />
            )}
            {showDashboardSpotlight && (
                <SpotlightTutorial
                    steps={dashboardSteps}
                    isActive={showDashboardSpotlight}
                    onComplete={completeDashboardSpotlight}
                    onSkip={completeTutorial}
                />
            )}
            {showHabitsDashboardSpotlight && (
                <SpotlightTutorial
                    steps={habitsDashboardSteps}
                    isActive={showHabitsDashboardSpotlight}
                    onComplete={completeHabitsDashboardSpotlight}
                    onSkip={completeTutorial}
                />
            )}
            <div>
                <div className="lg:flex lg:justify-between items-start">
                    <div className="flex flex-col lg:w-full">
                        <header className="md:flex md:justify-center lg:justify-start ">
                            <Perfil />
                        </header>

                        {/* Desktop */}
                        <div className="hidden lg:flex justify-between">
                            <Shortcuts />

                            <div className="hidden lg:flex flex-wrap justify-evenly items-center py-3 mt-7 w-full mr-3 gap-4">
                                {widgetsIdsInUse?.length > 0 ? widgetsIdsInUse.map((id: string) => (
                                    <WidgetsFabric
                                        key={id}
                                        widgetId={id as keyof WidgetProps}
                                        categoriePassed={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                        constance={constance}
                                        checked={checkedItemsInScheduledRoutine}
                                        total={totalItemsInScheduledRoutine}
                                        xp={xp}
                                        level={level}
                                        nextLevelXp={nextLevelXp}
                                        actualLevelXp={actualLevelXp}
                                        draggable
                                    />
                                )) : (
                                    <p className="text-description">{t('NoWidgets')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="flex flex-wrap items-center justify-evenly gap-3 p-1 md:p-2 py-3 mt-5 lg:hidden">
                        {widgetsIdsInUse?.length > 0 ? widgetsIdsInUse.map((id: string) => (
                            <WidgetsFabric
                                key={id}
                                widgetId={id as keyof WidgetProps}
                                categoriePassed={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                constance={constance}
                                checked={checkedItemsInScheduledRoutine}
                                total={totalItemsInScheduledRoutine}
                                xp={xp}
                                level={level}
                                nextLevelXp={nextLevelXp}
                                actualLevelXp={actualLevelXp}
                                draggable
                            />
                        )) : (
                            <p className="text-description">{t('NoWidgets')}</p>
                        )}
                    </div>

                    <div className="lg:w-full">
                        <RoutineDay routine={routine ? routine : null} />
                    </div>
                    {/* Mobile */}
                    <div className="block lg:hidden">
                        <Shortcuts />
                    </div>

                </div>
                <div className="mt-12 min-h-[50vh]">
                    <GoalsTab />
                </div>
            </div>
        </>
    )
}

export default Dashboard;
