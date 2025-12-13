import { useTranslation } from "react-i18next";
import Header from "../../components/header";
import AddRoutineButton from "../../components/routines/addRoutineButton";
import { useEffect, useState } from "react";
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

const Routine = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [onCreateRoutine, setOnCreateRoutine] = useState(false);
    const [routineType, setRoutineType] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const editMode = useSelector((state: RootState) => state.editRoutine.editMode);
    const routines = useSelector((state: RootState) => state.routines.routines) as routineType[] || [];

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

    return (
        <div className="bg-background text-secondary min-h-screen pb-4">
            <Header pageName="Your Routines" />
            <main className="flex flex-col gap-6 min-h-[80vh] mt-4 mx-4">
                <RoutineSummary
                    routines={routines}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />

                <div className="flex flex-col lg:flex-row items-center lg:items-start justify-start lg:justify-between gap-6">
                    <div className="w-full lg:w-[50%]">
                        <RenderRoutines selectedDate={selectedDate} />
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
                                        <CreateRoutine setRoutineType={setRoutineType}
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
