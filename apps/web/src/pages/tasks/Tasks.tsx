import { useEffect, useMemo, useState } from "react";
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

/** Altura e superfície comuns aos controles da barra (input + selects). */
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

    // O filtro de categoria sai das próprias tarefas: só aparece o que está em uso.
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
    // Sem chave própria de busca no i18n: o rótulo é composto com as existentes
    // (mesma convenção de categorias/metas) e capitalizado no CSS.
    const searchLabel = t("TaskSearchPlaceholder");

    const handleSortChange = (value: string) => {
        dispatch(setViewSort({ view: "tasks", sortBy: value }));
    };

    // Criar e editar acontecem em modal: a página inteira fica para os cartões.
    const isFormOpen = isCreateOpen || isEditMode;
    const closeForm = () => {
        setIsCreateOpen(false);
        if (isEditMode) {
            dispatch(editModeEnter(false));
        }
    };

    useEffect(() => {
        const returnTasks = async () => {
            const response = await getTasks(t);
            if (Array.isArray(response.success)) {
                setTasks(response.success);
            }
        }
        returnTasks();
    }, [t])

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
                    />
                }
            />

            {/* Barra compacta: buscar, ordenar e filtrar numa linha só. */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
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
                <select
                    value={sortBy}
                    onChange={(event) => handleSortChange(event.target.value)}
                    aria-label={t("Sort by")}
                    className={`${CONTROL_CLASS} px-3 sm:max-w-[220px]`}
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
                    className={`${CONTROL_CLASS} px-3 sm:max-w-[220px]`}
                >
                    <option value={ALL_CATEGORIES}>{t("All")}</option>
                    {categoriesInUse.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            <RenderTasks
                tasks={visibleTasks}
                setTasks={setTasks}
                emptyTitle={isFiltered && tasks.length > 0 ? t("NoTasksYet") : undefined}
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
    )
}

export default Tasks;
