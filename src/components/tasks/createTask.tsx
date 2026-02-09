import TaskForm from "./TaskForm";
import type { task } from "../../types/tasks/taskType";

function CreateTask({ setTasks }: { setTasks: React.Dispatch<React.SetStateAction<task[]>> }) {
    return <TaskForm mode="create" setTasks={setTasks} />;
}

export default CreateTask;
