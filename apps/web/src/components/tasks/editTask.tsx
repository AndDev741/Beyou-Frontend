import TaskForm from "./TaskForm";
import type { task } from "../../types/tasks/taskType";

function EditTask({ setTasks }: { setTasks: React.Dispatch<React.SetStateAction<task[]>> }) {
    return <TaskForm mode="edit" setTasks={setTasks} />;
}

export default EditTask;
