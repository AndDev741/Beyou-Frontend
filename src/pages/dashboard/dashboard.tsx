import { useSelector } from "react-redux";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { useEffect } from "react";
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

function Dashboard() {
    useAuthGuard();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
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
        }
        fetchRoutines();
    }, [dispatch, t])

    return (
        <>
            <div className="">
                <div className="lg:flex lg:justify-between items-start">
                    <div className="flex flex-col lg:w-[50%]">
                        <header className="md:flex md:justify-center lg:justify-start ">
                            <Perfil />
                        </header>

                        {/* Desktop */}
                        <div className="hidden lg:block">
                            <Shortcuts />
                        </div>
                    </div>

                    <div className="py-3 lg:w-[50%]">
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