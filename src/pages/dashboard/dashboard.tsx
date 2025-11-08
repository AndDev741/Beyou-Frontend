import { useSelector } from "react-redux";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { useEffect, useState } from "react";
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
import category from "../../types/category/categoryType";
import getCategories from "../../services/categories/getCategories";
import WidgetsFabric, { WidgetProps } from "../../components/widgets/utils/widgetsFabric";
import { categoryWithLessXpEnter, categoryWithMoreXpEnter, checkedItemsInScheduledRoutineEnter, totalItemsInScheduledRoutineEnter } from "../../redux/user/perfilSlice";

function Dashboard() {
    useAuthGuard();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const widgetsIdsInUse = useSelector((state: RootState) => state.perfil.widgetsIdsInUse);
    const constance = useSelector((state: RootState) => state.perfil.constance);
    const categoryWithMoreXp = useSelector((state: RootState) => state.perfil.categoryWithMoreXp);
    const categoryWithLessXp = useSelector((state: RootState) => state.perfil.categoryWithLessXp);
    const checkedItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.checkedItemsInScheduledRoutine);
    const totalItemsInScheduledRoutine = useSelector((state: RootState) => state.perfil.totalItemsInScheduledRoutine);

    console.log("Today Routine: ", routine);


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
            if (categories?.success?.length > 0) {
                const categoriesLoop = categories.success as category[];
                const categoryWithMoreXp = categoriesLoop.reduce((prev, current) => {
                    return (prev.xp > current.xp) ? prev : current;
                });
                const categoryWithLessXp = categoriesLoop.reduce((prev, current) => {
                    return (prev.xp < current.xp) ? prev : current;
                });

                dispatch(categoryWithMoreXpEnter(categoryWithMoreXp));
                dispatch(categoryWithLessXpEnter(categoryWithLessXp));
            }
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

    return (
        <>
            <div>
                <div className="lg:flex lg:justify-between items-start">
                    <div className="flex flex-col lg:w-[50%]">
                        <header className="md:flex md:justify-center lg:justify-start ">
                            <Perfil />
                        </header>

                        {/* Desktop */}
                        <div className="hidden lg:block lg:flex justify-between">
                            <Shortcuts />

                            <div className="hidden lg:flex flex-wrap justify-between items-center py-3 mt-7 w-[35vw] mr-3 gap-4">
                                {widgetsIdsInUse?.length > 0 ? widgetsIdsInUse.map((id: string, index: number) => (
                                    <WidgetsFabric
                                        key={id}
                                        widgetId={id as keyof WidgetProps}
                                        categoriePassed={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                        constance={constance}
                                        checked={checkedItemsInScheduledRoutine}
                                        total={totalItemsInScheduledRoutine}
                                        draggable
                                    />
                                )) : (
                                    <p className="text-description">{t('NoWidgets')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="flex flex-wrap items-center justify-evenly gap-3 p-2 py-3 mt-5 lg:hidden">
                        {widgetsIdsInUse?.length > 0 ? widgetsIdsInUse.map((id: string, index: number) => (
                            <WidgetsFabric
                                key={id}
                                widgetId={id as keyof WidgetProps}
                                categoriePassed={id === "betterArea" ? categoryWithMoreXp : categoryWithLessXp}
                                constance={constance}
                                checked={checkedItemsInScheduledRoutine}
                                total={totalItemsInScheduledRoutine}
                                draggable
                            />
                        )) : (
                            <p className="text-description">{t('NoWidgets')}</p>
                        )}
                    </div>

                    <div className="lg:w-[50%]">
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