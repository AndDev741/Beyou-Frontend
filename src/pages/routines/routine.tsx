import { useTranslation } from "react-i18next";
import routineIcon from '../../assets/dashboard/shortcuts/routineIcon.svg';
import Header from "../../components/header";
import AddRoutineButton from "../../components/routines/addRoutineButton";
import { useEffect, useState } from "react";
import CreateRoutine from "../../components/routines/CreateRoutine";
import getHabits from "../../services/habits/getHabits";
import { useDispatch } from "react-redux";
import { enterHabits } from "../../redux/habit/habitsSlice";
import getTasks from "../../services/tasks/getTasks";
import { enterTasks } from "../../redux/task/tasksSlice";

const Routine = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [onCreateRoutine, setOnCreateRoutine] = useState(false);
    const [routineType, setRoutineType] = useState("");
    useEffect(() => {

        const fetchHabitsAndTasks = async () => {
            console.log("Fetching habits and tasks...");
            const habits = await getHabits(t);
            const tasks = await getTasks(t);

            dispatch(enterHabits(habits?.success));
            dispatch(enterTasks(tasks?.success));
        }

        fetchHabitsAndTasks();
    }, []);

    return (
        <>
            <Header pageName={t("Your Routines")}/>
            <main className="flex flex-col items-center justify-start h-screen mt-8">
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
                            routineType={routineType}/>
                        </div>
                    )}
            </main>
        </>
    );
};

export default Routine;