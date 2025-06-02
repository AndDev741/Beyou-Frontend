import { useSelector } from "react-redux";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import Perfil from "../../components/dashboard/perfil";
import Shortcuts from "../../components/dashboard/shortcuts";
import useAuthGuard from "../../components/useAuthGuard";
import { RootState } from "../../redux/rootReducer";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import getRoutines from "../../services/routine/getRoutines";
import { useDispatch } from "react-redux";
import { enterRoutines } from "../../redux/routine/routinesSlice";
import { enterHabits } from "../../redux/habit/habitsSlice";
import getTasks from "../../services/tasks/getTasks";
import { enterTasks } from "../../redux/task/tasksSlice";
import getHabits from "../../services/habits/getHabits";

function Dashboard() {
    useAuthGuard();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const routines = useSelector((state: RootState) => state.routines.routines);
    console.log("Routines: ", routines);

    useEffect(() => {
        const fetchRoutines = async () => {
            const routines = await getRoutines(t);
            dispatch(enterRoutines(routines.success));

            const habits = await getHabits(t);
            dispatch(enterHabits(habits.success));

            const tasks = await getTasks(t);
            dispatch(enterTasks(tasks.success));
        }
        fetchRoutines();
    }, [])

    return (
        <>
            <div className="">
                <div className="lg:flex lg:justify-between items-start">
                    <div className="flex flex-col lg:w-[50%]">
                        <header className="md:flex md:justify-center lg:justify-start ">
                            <Perfil />
                        </header>

                        <div className="hidden lg:block">
                            <Shortcuts />
                        </div>
                    </div>

                    <div className="py-3 lg:w-[50%]">
                        <RoutineDay routine={routines[0] ? routines[0] : null} />
                    </div>
                    <div className="block lg:hidden">
                        <Shortcuts />
                    </div>

                </div>




            </div>
        </>
    )
}

export default Dashboard;