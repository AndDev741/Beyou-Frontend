import { useSelector } from "react-redux";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import Perfil from "../../components/dashboard/perfil";
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
import GoalsHorizon from "../../components/dashboard/goalsView/GoalsHorizon";
import WidgetCarousel from "../../components/dashboard/WidgetCarousel";
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
import TutorialFinale from "../../components/tutorial/TutorialFinale";
import { useDashboardTutorial } from "../../components/tutorial/hooks/useDashboardTutorial";
import AiOnboardingWizard from "../../components/tutorial/aiOnboarding/AiOnboardingWizard";
import { logger } from "../../utils/logger";
import EmptyState from "../../components/EmptyState";
import { LayoutGrid } from "lucide-react";
import { useDismissed } from "../../hooks/useDismissed";

function Dashboard() {
    useAuthGuard();
    // With no widgets the column becomes an invitation; whoever does not want it
    // closes it and it stays closed — configuration is still one click away.
    const [widgetsInviteDismissed, dismissWidgetsInvite] = useDismissed("widgets-invite");
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
    
    const {
        showFinale,
        showIntroModal,
        showAiOnboarding,
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
        startAiOnboarding,
        completeDashboardSpotlight,
        completeHabitsDashboardSpotlight,
        completeRoutinesDashboardSpotlight,
        completeRoutineSummarySpotlight,
        completeConfigDashboardSpotlight,
        completeTutorial
    } = useDashboardTutorial();

    // Also re-runs when the AI onboarding wizard closes (showAiOnboarding
    // true -> false): the wizard creates entities — including the scheduled
    // routine that getTodayRoutine depends on — after this initial load.
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
    }, [dispatch, t, showAiOnboarding])

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

    return (
        <>
            {showIntroModal && (
                <OnboardingTutorial
                    onComplete={startDashboardSpotlight}
                    onSkip={completeTutorial}
                    onChooseAi={startAiOnboarding}
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
            {showAiOnboarding && (
                <AiOnboardingWizard
                    onFinish={completeTutorial}
                    onTakeTour={startDashboardSpotlight}
                    onFallbackToManual={startDashboardSpotlight}
                />
            )}
            {showFinale && <TutorialFinale onDone={completeTutorial} />}
            {isDashboardLoading ? (
                <div
                    className="flex min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] items-center justify-center"
                    data-testid="dashboard-loading"
                >
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-transparent" />
                </div>
            ) : (
            <>
            {/* Two columns as in the mockup: the main one (greeting, routine) and
                the widget rail, which starts at the top and runs the full height
                da direita. */}
            <div className="w-full lg:flex lg:items-start lg:gap-6">
                <div className="min-w-0 flex-1 px-3 py-5 lg:px-7 lg:py-6">
                    <Perfil />

                    <div className="mt-5">
                        <RoutineDay routine={routine ? routine : null} />
                    </div>

                    {/* Mobile: a fixed-height carousel between the routine and the
                        goals, with page dots. */}
                    <div className="mt-5" data-testid="mobile-widget-board">
                        {widgetsIdsInUse?.length > 0 ? (
                            <WidgetCarousel>
                                {widgetsIdsInUse.map((id: string) => (
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
                                ))}
                            </WidgetCarousel>
                        ) : widgetsInviteDismissed ? null : (
                            <div className="lg:hidden">
                                <EmptyState
                                    icon={<LayoutGrid size={20} aria-hidden="true" />}
                                    title={t('NoWidgetsTitle')}
                                    description={t('NoWidgetsDescription')}
                                    actionLabel={t('AddWidgets')}
                                    actionTo="/configuration"
                                    onDismiss={dismissWidgetsInvite}
                                    testId="no-widgets-empty-state-mobile"
                                />
                            </div>
                        )}
                    </div>

                </div>

                <aside className="hidden w-[320px] shrink-0 flex-col gap-3.5 py-6 pr-6 lg:flex">
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
                    )) : widgetsInviteDismissed ? null : (
                        <EmptyState
                            icon={<LayoutGrid size={20} aria-hidden="true" />}
                            title={t('NoWidgetsTitle')}
                            description={t('NoWidgetsDescription')}
                            actionLabel={t('AddWidgets')}
                            actionTo="/configuration"
                            onDismiss={dismissWidgetsInvite}
                            testId="no-widgets-empty-state-desktop"
                        />
                    )}
                </aside>
            </div>

            {/* Goals close the screen at full width, below the routine and the rail:
                they are the why behind the day's checks, and they were hidden in a
                narrow column. */}
            <div className="px-3 pb-6 lg:px-7">
                <GoalsHorizon />
            </div>
            </>
            )}
        </>
    )
}

export default Dashboard;
