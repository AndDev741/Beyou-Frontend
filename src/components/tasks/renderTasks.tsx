import { useTranslation } from "react-i18next";
import { task } from "../../types/tasks/taskType";
import TaskBox from "./taskBox";

type renderTasksProps = {
    tasks: task[],
    setTasks: React.Dispatch<React.SetStateAction<task[]>>
}

function RenderTasks({tasks, setTasks}: renderTasksProps){
    const {t} = useTranslation();

    return(
        <div className="flex flex-wrap items-start justify-between md:justify-evenly lg:justify-start">
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
                            updatedAt={task.updatedAt}
                            setTasks={setTasks}
                        />
                    </div>
                ))
            ) : (
                <h2 className="text-blueMain font-semibold text-[30px] text-center lg:text-start lg:mt-12">
                    {t('Start creating amazing tasks to organize your day!')}
                </h2>
            )}
        </div>
    )
}

export default RenderTasks;