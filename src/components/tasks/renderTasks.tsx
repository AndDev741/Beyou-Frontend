import { useTranslation } from "react-i18next";
import { task } from "../../types/tasks/taskType";
import TaskBox from "./taskBox";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { editModeEnter } from "../../redux/task/editTaskSlice";

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
        <div className="flex flex-wrap items-start justify-between md:justify-evenly lg:justify-start text-secondary">
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
                            dificulty={task.dificulty}
                            createdAt={task.createdAt}
                            oneTimeTask={task.oneTimeTask}
                            updatedAt={task.updatedAt}
                            markedToDelete={task.markedToDelete}
                            setTasks={setTasks}
                        />
                    </div>
                ))
            ) : (
                <h2 className="text-primary font-semibold text-[30px] text-center lg:text-start lg:mt-12">
                    {t('Start creating amazing tasks to organize your day!')}
                </h2>
            )}
        </div>
    )
}

export default RenderTasks;
