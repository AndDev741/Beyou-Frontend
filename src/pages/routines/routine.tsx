import { useTranslation } from "react-i18next";
import routineIcon from '../../assets/dashboard/shortcuts/routineIcon.svg';
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
import { editModeEnter } from "../../redux/routine/editRoutineSlice";
import EditDailyRoutine from "../../components/routines/dailyRoutine/EditDailyRoutine";

const Routine = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [onCreateRoutine, setOnCreateRoutine] = useState(false);
    const [routineType, setRoutineType] = useState("");
    const editMode = useSelector((state: RootState) => state.editRoutine.editMode);

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
        <>
            <Header pageName={t("Your Routines")} />
            <main className="flex flex-col lg:flex-row items-center lg:items-start justify-start lg:justify-between h-screen mt-8">

                <div className="w-full lg:w-[50%]">
                    <RenderRoutines />
                </div>

                <div className="lg:w-[50%] lg:flex flex-col items-center justify-center">
                    {editMode === false ? (
                        <>
                            <AddRoutineButton
                                setOnCreateRoutine={setOnCreateRoutine}
                                setRoutineType={setRoutineType}
                            />

                            {onCreateRoutine && (
                                <div className='flex mt-6'>
                                    <img src={routineIcon}
                                        alt={t('Routines icon alt')}
                                        className="w-9 h-9 mr-2" />
                                    <h1 className='text-3xl font-semibold'>{t("Create routine")}</h1>
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
            </main>
        </>
    );
};

export default Routine;