import { useTranslation } from "react-i18next";
import { task } from "@beyou/types/tasks/taskType";
import TaskBox from "./taskBox";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { editModeEnter } from "../../redux/task/editTaskSlice";
import EmptyState from "../EmptyState";

type renderTasksProps = {
    tasks: task[],
    setTasks: React.Dispatch<React.SetStateAction<task[]>>
}

function RenderTasks({tasks, setTasks}: renderTasksProps){
    const {t} = useTranslation();
    const dispatch = useDispatch();
  
    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []); 
    return(
        <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 text-secondary">
           {tasks.length > 0 ? (
                tasks.map(task => (
                    <div key={task.id}>
                        <TaskBox
                            id={task.id}
                            name={task.name}
                            iconId={task.iconId}
                            description={task.description!}
                            categories={task.categories}
                            importance={task.importance}
                            dificulty={task.difficulty}
                            createdAt={task.createdAt}
                            oneTimeTask={task.oneTimeTask}
                            updatedAt={task.updatedAt}
                            markedToDelete={task.markedToDelete}
                            setTasks={setTasks}
                        />
                    </div>
                ))
            ) : (
                <EmptyState emoji="✅" title={t('Start creating amazing tasks to organize your day!')} />
            )}
        </div>
    )
}

export default RenderTasks;
