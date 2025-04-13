import { useEffect, useState } from "react";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import { task } from "../../types/tasks/taskType";
import RenderTasks from "../../components/tasks/renderTasks";
import getTasks from "../../services/tasks/getTasks";
import { t } from "i18next";
import CreateTask from "../../components/tasks/createTask";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import EditTask from "../../components/tasks/editTask";


function Tasks() {
    useAuthGuard();

    const isEditMode = useSelector((state: RootState) => state.editTask.editMode);
    const [tasks, setTasks] = useState<task[]>([]);

    useEffect(() => {
        const returnTasks = async () => {
            const response = await getTasks(t);
            if (Array.isArray(response.success)) {
                setTasks(response.success);
            }
        }
        returnTasks();
    }, [])

    return (
        <div className="lg:flex flex-col items-center w-full">
            <Header pageName="Your Tasks" />
            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] p-2">
                <div>
                    <RenderTasks
                        tasks={tasks}
                        setTasks={setTasks}
                    />
                </div>
                <div className="lg:mr-12">
                    <div className={`${isEditMode ? "hidden" : "block"}`}>
                        <CreateTask setTasks={setTasks} />
                    </div>
                    <div className={`${isEditMode ? "block" : "hidden"}`}>
                        <EditTask setTasks={setTasks} />
                    </div>

                </div>
            </div>
        </div>
    )
}

export default Tasks;