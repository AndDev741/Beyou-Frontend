import { useEffect, useMemo, useState } from "react";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import { task } from "../../types/tasks/taskType";
import RenderTasks from "../../components/tasks/renderTasks";
import getTasks from "../../services/tasks/getTasks";
import CreateTask from "../../components/tasks/createTask";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import EditTask from "../../components/tasks/editTask";
import SortFilterBar, { SortOption } from "../../components/filters/SortFilterBar";
import {
  compareNumbers,
  compareStrings,
  getTimestamp,
  sortItems
} from "../../components/utils/sortHelpers";
import { useTranslation } from "react-i18next";
import { setViewSort } from "../../redux/viewFilters/viewFiltersSlice";


function Tasks() {
    useAuthGuard();

    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isEditMode = useSelector((state: RootState) => state.editTask.editMode);
    const [tasks, setTasks] = useState<task[]>([]);
    const sortBy = useSelector((state: RootState) => state.viewFilters.tasks);

    const sortOptions: SortOption[] = [
        { value: "default", label: t("Default order") },
        { value: "name-asc", label: t("Name (A-Z)") },
        { value: "name-desc", label: t("Name (Z-A)") },
        { value: "importance-desc", label: t("Importance (High to Low)") },
        { value: "importance-asc", label: t("Importance (Low to High)") },
        { value: "difficulty-desc", label: t("Difficulty (High to Low)") },
        { value: "difficulty-asc", label: t("Difficulty (Low to High)") },
        { value: "created-desc", label: t("Newest first") },
        { value: "created-asc", label: t("Oldest first") }
    ];

    const sortedTasks = useMemo(() => {
        switch (sortBy) {
            case "name-asc":
                return sortItems(tasks, (a, b) => compareStrings(a.name, b.name));
            case "name-desc":
                return sortItems(tasks, (a, b) => compareStrings(b.name, a.name));
            case "importance-desc":
                return sortItems(tasks, (a, b) => compareNumbers(b.importance, a.importance));
            case "importance-asc":
                return sortItems(tasks, (a, b) => compareNumbers(a.importance, b.importance));
            case "difficulty-desc":
                return sortItems(tasks, (a, b) => compareNumbers(b.dificulty, a.dificulty));
            case "difficulty-asc":
                return sortItems(tasks, (a, b) => compareNumbers(a.dificulty, b.dificulty));
            case "created-desc":
                return sortItems(tasks, (a, b) =>
                    compareNumbers(getTimestamp(b.createdAt), getTimestamp(a.createdAt))
                );
            case "created-asc":
                return sortItems(tasks, (a, b) =>
                    compareNumbers(getTimestamp(a.createdAt), getTimestamp(b.createdAt))
                );
            default:
                return tasks;
        }
    }, [tasks, sortBy]);

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "tasks", sortBy: value }));
    };

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
        <div className="lg:flex flex-col items-center w-full bg-background text-secondary min-h-screen">
            <Header pageName="Your Tasks" />
            <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] p-2">
                <div className="w-full">
                    <SortFilterBar
                        title={t("Tasks workspace")}
                        description={t("Sort results")}
                        options={sortOptions}
                        value={sortBy}
                        onChange={handleSortChange}
                        quickValues={["name-asc", "importance-desc", "created-desc"]}
                        className="mb-4"
                    />
                    <RenderTasks
                        tasks={sortedTasks}
                        setTasks={setTasks}
                    />
                </div>
                <div className="w-full">
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
