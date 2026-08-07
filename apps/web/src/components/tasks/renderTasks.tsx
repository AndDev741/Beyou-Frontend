import { useTranslation } from "react-i18next";
import { task } from "@beyou/types/tasks/taskType";
import TaskBox from "./taskBox";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { editModeEnter } from "@beyou/state/task/editTaskSlice";
import EmptyState from "../EmptyState";
import { ListChecks, Search } from "lucide-react";

type renderTasksProps = {
    tasks: task[],
    setTasks: React.Dispatch<React.SetStateAction<task[]>>,
    /** Sobrescreve o vazio quando a lista sumiu pela busca/filtro, não por falta de tarefas. */
    emptyTitle?: string,
    /** Limpa busca e filtros a partir do estado vazio. */
    onClearFilters?: () => void
}

function RenderTasks({tasks, setTasks, emptyTitle, onClearFilters}: renderTasksProps){
    const {t} = useTranslation();
    const dispatch = useDispatch();

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);

    const hasTasks = tasks.length > 0;

    return(
        // Grid escaneável: 3 colunas no desktop, 1 no mobile.
        <div className={`text-text ${hasTasks ? "grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3" : ""}`}>
           {hasTasks ? (
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
            ) : emptyTitle ? (
                <EmptyState
                    icon={<Search size={20} aria-hidden="true" />}
                    title={emptyTitle}
                    description={t('NoResultsDescription')}
                    actionLabel={onClearFilters ? t('ClearFilters') : undefined}
                    onAction={onClearFilters}
                    variant="ghost"
                />
            ) : (
                <EmptyState
                    icon={<ListChecks size={20} aria-hidden="true" />}
                    title={t('0TasksTitle')}
                    description={t('Start creating amazing tasks to organize your day!')}
                />
            )}
        </div>
    )
}

export default RenderTasks;
