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
import Constance from "../../components/dashboard/widgets/constance";
import DailyProgress from "../../components/dashboard/widgets/dailyProgress";
import isItemChecked from "../../components/utils/verifyIfAItemItsChecked";
import BetterArea from "../../components/dashboard/widgets/betterArea";
import category from "../../types/category/categoryType";
import getCategories from "../../services/categories/getCategories";
import FastTips from "../../components/dashboard/widgets/fastTips";
import WorstArea from "../../components/dashboard/widgets/worstArea";

function Dashboard() {
    useAuthGuard();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const constance = useSelector((state: RootState) => state.perfil.constance);
    const [checkedItems, setCheckedItems] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [categoryWithMoreXp, setCategoryWithMoreXp] = useState<category | null>(null);
    const [categoryWithLessXp, setCategoryWithLessXp] = useState<category | null>(null);
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
            if (categories.success.length > 0) {
                const categoriesLoop = categories.success as category[];
                const categoryWithMoreXp = categoriesLoop.reduce((prev, current) => {
                    return (prev.xp > current.xp) ? prev : current;
                });
                const categoryWithLessXp = categoriesLoop.reduce((prev, current) => {
                    return (prev.xp < current.xp) ? prev : current;
                });
                setCategoryWithMoreXp(categoryWithMoreXp);
                setCategoryWithLessXp(categoryWithLessXp);
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
    setCheckedItems(checkedCount);
    setTotalItems(totalCount);

}, [routine]);
    return (
        <>
            <div className="">
                <div className="lg:flex lg:justify-between items-start">
                    <div className="flex flex-col lg:w-[50%]">
                        <header className="md:flex md:justify-center lg:justify-start ">
                            <Perfil />
                        </header>

                        {/* Desktop */}
                        <div className="hidden lg:block lg:flex justify-between">
                            <Shortcuts />

                            <div className="hidden lg:flex flex-col items-start py-3 mt-7 w-[35vw] mr-3">
                                <FastTips/>
                                <div className="flex justify-between my-3 w-[100%]"> {/* THink in a better way to handle the width */}
                                    <BetterArea category={categoryWithMoreXp} />
                                    <WorstArea category={categoryWithLessXp} />
                                </div>
                                <DailyProgress checked={checkedItems} total={totalItems} />
                            </div>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center justify-evenly py-3 mt-5 lg:hidden">
                        <BetterArea category={categoryWithMoreXp}/>
                        <DailyProgress checked={checkedItems} total={totalItems} />
                        <Constance constance={constance} />
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