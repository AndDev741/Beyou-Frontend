import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuthGuard from "../../components/useAuthGuard";
import RenderGoals, { type GoalsViewMode } from "../../components/goals/renderGoals";
import getGoals from "@beyou/api/goals/getGoals";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useTranslation } from "react-i18next";
import CreateGoal from "../../components/goals/createGoal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import EditGoal from "../../components/goals/editGoal";
import AddSubGoalModal from "../../components/goals/AddSubGoalModal";
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
import { rootsForFilter } from "@beyou/state";
import PageHeader from "../../ui/PageHeader";
import SegmentedControl from "../../ui/SegmentedControl";
import Modal from "../../components/modals/Modal";
import Button from "../../components/Button";
import { Maximize2, Plus, Search, X } from "lucide-react";

/** "all", or one value of the backend's status enum. */
type StatusFilter = "all" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type SortOption = { value: string; label: string };

/** Bar filter: shares the row on phones, its own width on desktop. */
const FILTER_CLASS =
  "h-10 min-w-0 flex-1 rounded-control border border-border bg-surface px-2 text-xs text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent lg:flex-none lg:px-3 lg:text-sm";

function Goals() {
  useAuthGuard();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isEditMode = useSelector((state: RootState) => state.editGoal.editMode);
  // const [goals, setGoals] = useState<goal[]>([]);
  const goals = useSelector((state: RootState) => state.goals.goals) || [];
  const sortBy = useSelector((state: RootState) => state.viewFilters.goals);

  // The form left the side of the list: the grid takes the full width and
  // criar/editar acontece em modal.
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // "Add sub-goal" on a card opens the same modal with the parent already chosen.
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);
  // "Add sub-goal" opens an explanation first, not the form: see AddSubGoalModal.
  const [subGoalParent, setSubGoalParent] = useState<goal | null>(null);
  // Grouped is the default: a main goal with its sub-goals folded under it. Flat is
  // for whoever wants every goal as its own card, hierarchy or not.
  const [viewMode, setViewMode] = useState<GoalsViewMode>("tree");
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

  // The filter options come from the goals themselves: no refetching categories
  // and no offering a filter that would return nothing.
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

  const sortList = useCallback((list: goal[]) => {
    switch (sortBy) {
      case "name-asc":
        return sortItems(list, (a, b) => compareStrings(a.name, b.name));
      case "name-desc":
        return sortItems(list, (a, b) => compareStrings(b.name, a.name));
      case "xp-desc":
        return sortItems(list, (a, b) => compareNumbers(b.xpReward, a.xpReward));
      case "xp-asc":
        return sortItems(list, (a, b) => compareNumbers(a.xpReward, b.xpReward));
      case "progress-desc":
        return sortItems(list, (a, b) => compareNumbers(getProgress(b), getProgress(a)));
      case "progress-asc":
        return sortItems(list, (a, b) => compareNumbers(getProgress(a), getProgress(b)));
      case "end-asc":
        return sortItems(list, (a, b) =>
          compareNumbers(getTimestamp(a.endDate), getTimestamp(b.endDate))
        );
      case "end-desc":
        return sortItems(list, (a, b) =>
          compareNumbers(getTimestamp(b.endDate), getTimestamp(a.endDate))
        );
      case "start-desc":
        return sortItems(list, (a, b) =>
          compareNumbers(getTimestamp(b.startDate), getTimestamp(a.startDate))
        );
      case "start-asc":
        return sortItems(list, (a, b) =>
          compareNumbers(getTimestamp(a.startDate), getTimestamp(b.startDate))
        );
      default:
        return list;
    }
  }, [sortBy]);

  // Grouped: the filter runs over every goal, and a main goal whose sub-goal matched
  // stays on the page (dimmed) so the match has somewhere to render. Sorting applies
  // to the roots; sub-goals inside a card come by deadline.
  const tree = useMemo(() => rootsForFilter(goals, filteredGoals), [goals, filteredGoals]);
  const sortedGoals = useMemo(
    () => sortList(viewMode === "tree" ? tree.roots : filteredGoals),
    [filteredGoals, sortList, tree.roots, viewMode]
  );

  const handleSortChange = (value: string) => {
    dispatch(setViewSort({ view: "goals", sortBy: value }));
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setCreateParentId(undefined);
    dispatch(editModeEnter(false));
  };

  const openCreate = (parentId?: string) => {
    setCreateParentId(parentId);
    setIsCreateOpen(true);
  };

  const openViewer = (goalId?: string) =>
    navigate(goalId ? `/goals/view?goal=${goalId}` : "/goals/view");

  const isFiltering = Boolean(search.trim()) || statusFilter !== "all" || categoryFilter !== "all";

  // No new i18n key: "filter" + "Goals" already exist in both languages.
  const searchLabel = t("GoalSearchPlaceholder");

  const loadGoals = useCallback(async () => {
    const response = await getGoals(t);
    if (Array.isArray(response.success)) {
      dispatch(enterGoals(response.success));
    }
  }, [dispatch, t]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  // A tab left open here goes stale the moment the phone completes a goal.
  useAutoRefresh(loadGoals);

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
          <div className="flex items-center gap-2">
            {goals.length > 0 && (
              <Button
                text={t("ViewOneByOne")}
                mode="ghost"
                size="medium"
                icon={<Maximize2 size={16} aria-hidden="true" />}
                onClick={() => openViewer()}
                testId="open-goal-viewer"
                collapseLabel
              />
            )}
            <Button
              text={t("Create Goal")}
              mode="primary"
              size="medium"
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => openCreate()}
              testId="create-goal"
              collapseLabel
            />
          </div>
        }
      />
      <main className="mt-4 flex flex-col gap-4 pb-4">
        {/* A compact bar in place of the sorting card: search, status, category and
            sorting on a single row. */}
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
          <div className="flex gap-2">
            <select
              aria-label={t("Status")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={FILTER_CLASS}
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
                className={FILTER_CLASS}
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
              className={`${FILTER_CLASS} lg:w-[220px]`}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {goals.some((goalItem) => goalItem.parentId) && (
              <SegmentedControl
                size="sm"
                label={t("SubGoals")}
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: "tree", label: t("ShowAsTree") },
                  { value: "flat", label: t("ShowAsFlatList") },
                ]}
              />
            )}
          </div>
        </div>

        <RenderGoals
          goals={sortedGoals}
          allGoals={goals}
          viewMode={viewMode}
          dimmedIds={viewMode === "tree" ? tree.viaDescendantOnly : undefined}
          onAddSubGoal={(parentId) => setSubGoalParent(goals.find((g) => g.id === parentId) ?? null)}
          onOpenViewer={(goalId) => openViewer(goalId)}
          emptyTitle={isFiltering && goals.length > 0 ? t("NoResultsTitle") : undefined}
          onClearFilters={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}
        />
      </main>

      <AddSubGoalModal
        parent={subGoalParent}
        allGoals={goals}
        onClose={() => setSubGoalParent(null)}
        onCreateNew={(parent) => {
          setSubGoalParent(null);
          openCreate(parent.id);
        }}
        onMoved={() => void loadGoals()}
      />

      {isFormOpen && (
        <Modal
          isOpen
          onClose={closeForm}
          labelledBy={isEditMode ? "goal-edit-title" : "goal-create-title"}
          className="max-w-xl"
        >
          <div className="flex items-center gap-3">
            <h2
              id={isEditMode ? "goal-edit-title" : "goal-create-title"}
              className="text-base font-semibold tracking-[-0.01em] text-text"
            >
              {isEditMode ? t("Edit Goal") : t("Create Goal")}
            </h2>
            <button
              type="button"
              aria-label={t("Close")}
              onClick={closeForm}
              className="ml-auto rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3.5">
            {isEditMode ? (
              <EditGoal onClose={closeForm} />
            ) : (
              <CreateGoal onClose={closeForm} defaultParentId={createParentId} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Goals;
