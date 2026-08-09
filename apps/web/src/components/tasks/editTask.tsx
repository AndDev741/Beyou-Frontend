import TaskForm from "./TaskForm";
import type { task } from "@beyou/types/tasks/taskType";

type EditTaskProps = {
    setTasks: React.Dispatch<React.SetStateAction<task[]>>;
    /** Closes the modal hosting the form. */
    onClose?: () => void;
};

function EditTask({ setTasks, onClose }: EditTaskProps) {
    return <TaskForm mode="edit" setTasks={setTasks} onClose={onClose} />;
}

export default EditTask;
