import { useEffect, useMemo, useState, useCallback } from "react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import useAuthGuard from "../../components/useAuthGuard";
import { task } from "@beyou/types/tasks/taskType";
import RenderTasks from "../../components/tasks/renderTasks";
import getTasks from "@beyou/api/tasks/getTasks";
import CreateTask from "../../components/tasks/createTask";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import EditTask from "../../components/tasks/editTask";
import { TASK_FORM_TITLE_ID } from "../../components/tasks/TaskForm";
import {
  compareNumbers,
  compareStrings,
  getTimestamp,
  sortItems
} from "../../components/utils/sortHelpers";
import { useTranslation } from "react-i18next";
import { setViewSort } from "@beyou/state/viewFilters/viewFiltersSlice";
import { editModeEnter } from "@beyou/state/task/editTaskSlice";
import PageHeader from "../../ui/PageHeader";
import Button from "../../components/Button";
import Modal from "../../components/modals/Modal";
import { Plus, Search } from "lucide-react";

type SortOption = {
    value: string;
    label: string;
};

const ALL_CATEGORIES = "all";

/** Height and surface shared by the bar's controls (input + selects). */
const CONTROL_CLASS =
    "h-10 rounded-control border border-border bg-surface text-sm text-text transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

function Tasks() {
    useAuthGuard();

    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isEditMode = useSelector((state: RootState) => state.editTask.editMode);
    const [tasks, setTasks] = useState<task[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
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
                return sortItems(tasks, (a, b) => compareNumbers(b.difficulty, a.difficulty));
            case "difficulty-asc":
                return sortItems(tasks, (a, b) => compareNumbers(a.difficulty, b.difficulty));
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

    // The category filter comes from the tasks themselves: only what is in use.
    const categoriesInUse = useMemo(() => {
        const byId = new Map<string, string>();
        tasks.forEach((item) => {
            Object.entries(item.categories ?? {}).forEach(([id, category]) => {
                byId.set(id, category?.name ?? "");
            });
        });
        return [...byId.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => compareStrings(a.name, b.name));
    }, [tasks]);

    const visibleTasks = useMemo(() => {
        const term = search.trim().toLowerCase();
        return sortedTasks.filter((item) => {
            const matchesTerm =
                term === "" ||
                item.name.toLowerCase().includes(term) ||
                (item.description ?? "").toLowerCase().includes(term);
            const matchesCategory =
                categoryFilter === ALL_CATEGORIES ||
                Object.keys(item.categories ?? {}).includes(categoryFilter);
            return matchesTerm && matchesCategory;
        });
    }, [sortedTasks, search, categoryFilter]);

    const isFiltered = search.trim() !== "" || categoryFilter !== ALL_CATEGORIES;
    // No dedicated search key in i18n: the label is composed from existing ones
    // (same convention as categories/goals) and capitalised in CSS.
    const searchLabel = t("TaskSearchPlaceholder");

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "tasks", sortBy: value }));
    };

    // Create and edit happen in a modal: the whole page is left to the cards.
    const isFormOpen = isCreateOpen || isEditMode;
    const closeForm = () => {
        setIsCreateOpen(false);
        if (isEditMode) {
            dispatch(editModeEnter(false));
        }
    };

    const loadTasks = useCallback(async () => {
        const response = await getTasks(t);
        if (Array.isArray(response.success)) {
            setTasks(response.success);
        }
    }, [t]);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    // This page keeps its list in local state rather than redux, so nothing else in
    // the app can bring it up to date. Leaving the tab open is leaving it wrong.
    useAutoRefresh(loadTasks);

    return (
        <div className="min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] w-full bg-bg px-4 py-6 text-text lg:px-7">
            <PageHeader
                title={t("YourTasks")}
                subtitle={`${tasks.length} ${t("Tasks")} · ${categoriesInUse.length} ${t("Categories")}`}
                action={
                    <Button
                        text={t("CreateTask")}
                        mode="primary"
                        size="medium"
                        icon={<Plus size={18} aria-hidden="true" />}
                        onClick={() => setIsCreateOpen(true)}
                        testId="create-task"
                        collapseLabel
                    />
                }
            />

            {/* On phones the search takes the whole row and the filters drop to
                the line below, side by side — all three together squeezed the search
                down to just the magnifier (`sm` here is 350px). */}
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative min-w-0 lg:flex-1">
                    <Search
                        size={16}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={searchLabel}
                        aria-label={searchLabel}
                        className={`${CONTROL_CLASS} w-full pl-9 pr-3 placeholder:text-text-3`}
                    />
                </div>

                <div className="flex gap-2">
                <select
                    value={sortBy}
                    onChange={(event) => handleSortChange(event.target.value)}
                    aria-label={t("Sort by")}
                    className={`${CONTROL_CLASS} min-w-0 flex-1 px-3 lg:w-[220px] lg:flex-none`}
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    aria-label={t("Categories")}
                    className={`${CONTROL_CLASS} min-w-0 flex-1 px-3 lg:w-[220px] lg:flex-none`}
                >
                    <option value={ALL_CATEGORIES}>{t("All")}</option>
                    {categoriesInUse.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                </div>
            </div>

            <RenderTasks
                tasks={visibleTasks}
                setTasks={setTasks}
                emptyTitle={isFiltered && tasks.length > 0 ? t("NoResultsTitle") : undefined}
                onClearFilters={() => { setSearch(""); setCategoryFilter(ALL_CATEGORIES); }}
            />

            {isFormOpen && (
                <Modal isOpen onClose={closeForm} labelledBy={TASK_FORM_TITLE_ID} className="max-w-xl">
                    {isEditMode ? (
                        <EditTask setTasks={setTasks} onClose={closeForm} />
                    ) : (
                        <CreateTask setTasks={setTasks} onClose={closeForm} />
                    )}
                </Modal>
            )}
        </div>
    );
}

export default Tasks;
