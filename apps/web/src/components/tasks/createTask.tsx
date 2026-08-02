import TaskForm from "./TaskForm";
import type { task } from "@beyou/types/tasks/taskType";

type CreateTaskProps = {
    setTasks: React.Dispatch<React.SetStateAction<task[]>>;
    /** Fecha o modal que hospeda o formulário. */
    onClose?: () => void;
};

function CreateTask({ setTasks, onClose }: CreateTaskProps) {
    return <TaskForm mode="create" setTasks={setTasks} onClose={onClose} />;
}

export default CreateTask;
