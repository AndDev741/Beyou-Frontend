import { useSelector } from "react-redux";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import BottomNav from "../../components/dashboard/BottomNav";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "@beyou/state/rootReducer";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import getTasks from "@beyou/api/tasks/getTasks";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import getHabits from "@beyou/api/habits/getHabits";
import getTodayRoutine from "@beyou/api/routine/getTodayRoutine";
import { enterTodayRoutine } from "@beyou/state/routine/todayRoutineSlice";
import GoalsTab from "../../components/dashboard/goalsView/goalsTab";
import getGoals from "@beyou/api/goals/getGoals";
import { enterGoals } from "@beyou/state/goal/goalsSlice";
import isItemChecked from "../../components/utils/verifyIfAItemItsChecked";
import getCategories from "@beyou/api/categories/getCategories";
import WidgetsFabric, { WidgetProps } from "../../components/widgets/utils/widgetsFabric";
import { checkedItemsInScheduledRoutineEnter, totalItemsInScheduledRoutineEnter } from "@beyou/state/user/perfilSlice";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import useChangeLanguage from "../../hooks/useChangeLanguage";
import OnboardingTutorial from "../../components/tutorial/OnboardingTutorial";
import SpotlightTutorial from "../../components/tutorial/SpotlightTutorial";
import { useDashboardTutorial } from "../../components/tutorial/hooks/useDashboardTutorial";
import { logger } from "../../utils/logger";
import EmptyState from "../../components/EmptyState";

function Dashboard() {
    useAuthGuard();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);

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

    const languageInUse = useSelector((state: RootState) => state.perfil.languageInUse);
    logger.log("Language in use => ", languageInUse)
    useChangeLanguage(languageInUse);
    
    useEffect(() => {
        let cancelled = false;
        const fetchDashboardData = async () => {
            await Promise.all([
                getTodayRoutine(t).then((r) => dispatch(enterTodayRoutine(r.success))),
                getHabits(t).then((r) => dispatch(enterHabits(r.success))),
                getTasks(t).then((r) => dispatch(enterTasks(r.success))),
                getGoals(t).then((r) => dispatch(enterGoals(r.success))),
                getCategories(t).then((r) => dispatch(enterCategories(r.success))),
            ]);
            if (!cancelled) setIsDashboardLoading(false);
        };
        fetchDashboardData();
        return () => {
            cancelled = true;
        };
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

    const {
        showIntroModal,
        showDashboardSpotlight,
        showHabitsDashboardSpotlight,
        showRoutinesDashboardSpotlight,
        showRoutineSummarySpotlight,
        showConfigDashboardSpotlight,
        dashboardSteps,
        habitsDashboardSteps,
        routinesDashboardSteps,
        routineSummarySteps,
        configDashboardSteps,
        startDashboardSpotlight,
        completeDashboardSpotlight,
        completeHabitsDashboardSpotlight,
        completeRoutinesDashboardSpotlight,
        completeRoutineSummarySpotlight,
        completeConfigDashboardSpotlight,
        completeTutorial
    } = useDashboardTutorial();

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
            {showRoutinesDashboardSpotlight && (
                <SpotlightTutorial
                    steps={routinesDashboardSteps}
                    isActive={showRoutinesDashboardSpotlight}
                    onComplete={completeRoutinesDashboardSpotlight}
                    onSkip={completeTutorial}
                />
            )}
            {showRoutineSummarySpotlight && (
                <SpotlightTutorial
                    steps={routineSummarySteps}
                    isActive={showRoutineSummarySpotlight}
                    onComplete={completeRoutineSummarySpotlight}
                    onSkip={completeTutorial}
                />
            )}
            {showConfigDashboardSpotlight && (
                <SpotlightTutorial
                    steps={configDashboardSteps}
                    isActive={showConfigDashboardSpotlight}
                    onComplete={completeConfigDashboardSpotlight}
                    onSkip={completeTutorial}
                />
            )}
            {isDashboardLoading ? (
                <div
                    className="flex min-h-screen items-center justify-center"
                    data-testid="dashboard-loading"
                >
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
            <div>
                <div className="lg:flex lg:justify-between items-start">
                    <div className="flex flex-col lg:w-full">
                        <header className="md:flex md:justify-center lg:justify-start m-1.5 md:m-0">
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
                                        categories={categories}
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
                                    <EmptyState
                                        emoji="🧩"
                                        title={t('NoWidgetsTitle')}
                                        description={t('NoWidgetsDescription')}
                                        actionLabel={t('AddWidgets')}
                                        actionTo="/configuration"
                                        testId="no-widgets-empty-state-desktop"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-full">
                        <RoutineDay routine={routine ? routine : null} />
                    </div>

                    {/* Mobile */}
                    <div className="flex flex-wrap items-center justify-evenly gap-3 p-1 md:p-2 py-3 mt-5 lg:hidden" data-testid="mobile-widget-board">
                        {widgetsIdsInUse?.length > 0 ? widgetsIdsInUse.map((id: string) => (
                            <WidgetsFabric
                                key={id}
                                widgetId={id as keyof WidgetProps}
                                categoriePassed={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                categories={categories}
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
                            <EmptyState
                                emoji="🧩"
                                title={t('NoWidgetsTitle')}
                                description={t('NoWidgetsDescription')}
                                actionLabel={t('AddWidgets')}
                                actionTo="/configuration"
                                testId="no-widgets-empty-state-mobile"
                            />
                        )}
                    </div>
                </div>
                <div className="mt-12 min-h-[50vh]">
                    <GoalsTab />
                </div>

                {/* Mobile: fixed bottom action bar (desktop keeps the Shortcuts sidebar) */}
                <BottomNav />
                {/* Spacer so the fixed bar never covers the last content on mobile */}
                <div className="h-20 lg:hidden" aria-hidden="true" />
            </div>
            )}
        </>
    )
}

export default Dashboard;
