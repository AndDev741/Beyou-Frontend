import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "../../components/useAuthGuard";
import RenderGoals from "../../components/goals/renderGoals";
import getGoals from "@beyou/api/goals/getGoals";
import { t } from "i18next";
import CreateGoal from "../../components/goals/createGoal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import EditGoal from "../../components/goals/editGoal";
import { enterGoals } from "@beyou/state/goal/goalsSlice";
import { editModeEnter } from "@beyou/state/goal/editGoalSlice";
import {
  compareNumbers,
  compareStrings,
  getTimestamp,
  sortItems
} from "../../components/utils/sortHelpers";
import { goal } from "@beyou/types/goals/goalType";
import { setViewSort } from "@beyou/state/viewFilters/viewFiltersSlice";
import PageHeader from "../../ui/PageHeader";
import Modal from "../../components/modals/Modal";
import Button from "../../components/Button";
import IconButton from "../../ui/IconButton";
import { Plus, Search, X } from "lucide-react";

/** "all" ou um valor do enum de status do backend. */
type StatusFilter = "all" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type SortOption = { value: string; label: string };

function Goals() {
  useAuthGuard();
  const dispatch = useDispatch();

  const isEditMode = useSelector((state: RootState) => state.editGoal.editMode);
  // const [goals, setGoals] = useState<goal[]>([]);
  const goals = useSelector((state: RootState) => state.goals.goals) || [];
  const sortBy = useSelector((state: RootState) => state.viewFilters.goals);

  // O formulário saiu de ao lado da lista: a grade ocupa a largura toda e
  // criar/editar acontece em modal.
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const isFormOpen = isCreateOpen || isEditMode;

  const sortOptions: SortOption[] = [
    { value: "default", label: t("Default order") },
    { value: "name-asc", label: t("Name (A-Z)") },
    { value: "name-desc", label: t("Name (Z-A)") },
    { value: "xp-desc", label: t("XP Reward (High to Low)") },
    { value: "xp-asc", label: t("XP Reward (Low to High)") },
    { value: "progress-desc", label: t("Progress (High to Low)") },
    { value: "progress-asc", label: t("Progress (Low to High)") },
    { value: "end-asc", label: t("End date (Sooner first)") },
    { value: "end-desc", label: t("End date (Later first)") },
    { value: "start-desc", label: t("Newest first") },
    { value: "start-asc", label: t("Oldest first") }
  ];

  const getProgress = (goalItem: goal) => {
    if (!goalItem.targetValue) {
      return 0;
    }
    return goalItem.currentValue / goalItem.targetValue;
  };

  const completedCount = goals.filter((goalItem) => goalItem.status === "COMPLETED").length;

  // As opções do filtro saem das próprias metas: sem buscar categorias de novo
  // e sem oferecer um filtro que não devolveria nada.
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    goals.forEach((goalItem) => {
      Object.entries(goalItem.categories ?? {}).forEach(([id, category]) => {
        if (!seen.has(id)) seen.set(id, category.name);
      });
    });
    return [...seen.entries()].sort((a, b) => compareStrings(a[1], b[1]));
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return goals.filter((goalItem) => {
      if (statusFilter !== "all" && goalItem.status !== statusFilter) return false;
      if (categoryFilter !== "all" && !(categoryFilter in (goalItem.categories ?? {}))) {
        return false;
      }
      if (!term) return true;
      return (
        (goalItem.name ?? "").toLowerCase().includes(term) ||
        (goalItem.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [goals, search, statusFilter, categoryFilter]);

  const sortedGoals = useMemo(() => {
    switch (sortBy) {
      case "name-asc":
        return sortItems(filteredGoals, (a, b) => compareStrings(a.name, b.name));
      case "name-desc":
        return sortItems(filteredGoals, (a, b) => compareStrings(b.name, a.name));
      case "xp-desc":
        return sortItems(filteredGoals, (a, b) => compareNumbers(b.xpReward, a.xpReward));
      case "xp-asc":
        return sortItems(filteredGoals, (a, b) => compareNumbers(a.xpReward, b.xpReward));
      case "progress-desc":
        return sortItems(filteredGoals, (a, b) => compareNumbers(getProgress(b), getProgress(a)));
      case "progress-asc":
        return sortItems(filteredGoals, (a, b) => compareNumbers(getProgress(a), getProgress(b)));
      case "end-asc":
        return sortItems(filteredGoals, (a, b) =>
          compareNumbers(getTimestamp(a.endDate), getTimestamp(b.endDate))
        );
      case "end-desc":
        return sortItems(filteredGoals, (a, b) =>
          compareNumbers(getTimestamp(b.endDate), getTimestamp(a.endDate))
        );
      case "start-desc":
        return sortItems(filteredGoals, (a, b) =>
          compareNumbers(getTimestamp(b.startDate), getTimestamp(a.startDate))
        );
      case "start-asc":
        return sortItems(filteredGoals, (a, b) =>
          compareNumbers(getTimestamp(a.startDate), getTimestamp(b.startDate))
        );
      default:
        return filteredGoals;
    }
  }, [filteredGoals, sortBy]);

  const handleSortChange = (value: string) => {
    dispatch(setViewSort({ view: "goals", sortBy: value }));
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    dispatch(editModeEnter(false));
  };

  const isFiltering = Boolean(search.trim()) || statusFilter !== "all" || categoryFilter !== "all";

  // Sem chave nova de i18n: "filtrar" + "Metas" já existem nos dois idiomas.
  const searchLabel = t("GoalSearchPlaceholder");

  useEffect(() => {
    const fetchGoals = async () => {
      const response = await getGoals(t);
      if (Array.isArray(response.success)) {
        dispatch(enterGoals(response.success));
      }
    };
    fetchGoals();
  }, [dispatch, t]);

  return (
    <div className="min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] w-full bg-bg px-4 py-6 text-text lg:px-7">
      <PageHeader
        title={t("YourGoals")}
        subtitle={
          completedCount > 0
            ? `${goals.length} ${t("Goals")} · ${completedCount} ${t("Completed")}`
            : `${goals.length} ${t("Goals")}`
        }
        action={
          <Button
            text={t("Create Goal")}
            mode="primary"
            size="medium"
            icon={<Plus size={16} aria-hidden="true" />}
            onClick={() => setIsCreateOpen(true)}
            testId="create-goal"
          />
        }
      />
      <main className="mt-4 flex flex-col gap-4 pb-4">
        {/* Barra compacta no lugar do cartão de ordenação: busca, status,
            categoria e ordenação numa linha só. */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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
              aria-label={searchLabel}
              placeholder={searchLabel}
              className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label={t("Status")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:flex-none"
            >
              <option value="all">{t("All")}</option>
              <option value="NOT_STARTED">{t("Not Started")}</option>
              <option value="IN_PROGRESS">{t("In Progress")}</option>
              <option value="COMPLETED">{t("Completed")}</option>
            </select>
            {categoryOptions.length > 0 && (
              <select
                aria-label={t("Categories")}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:flex-none"
              >
                <option value="all">{t("All")}</option>
                {categoryOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label={t("Sort by")}
              value={sortBy}
              onChange={(event) => handleSortChange(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:flex-none lg:w-[220px]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <RenderGoals
          goals={sortedGoals}
          emptyTitle={isFiltering && goals.length > 0 ? t("NoGoalsYet") : undefined}
        />
      </main>

      {isFormOpen && (
        <Modal
          isOpen
          onClose={closeForm}
          labelledBy={isEditMode ? "goal-edit-title" : "goal-create-title"}
          className="max-w-4xl"
        >
          <IconButton label={t("Close")} onClick={closeForm} className="absolute right-3 top-3">
            <X size={18} aria-hidden="true" />
          </IconButton>
          {isEditMode ? <EditGoal onClose={closeForm} /> : <CreateGoal onClose={closeForm} />}
        </Modal>
      )}
    </div>
  );
}

export default Goals;
