import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { goal } from "@beyou/types/goals/goalType";
import GoalBox from "./goalBox";
import { useDispatch } from "react-redux";
import { useEffect, useMemo } from "react";
import { editModeEnter } from "@beyou/state/goal/editGoalSlice";
import { ancestorsOf, childrenOf, depthOf } from "@beyou/state";
import EmptyState from "../EmptyState";
import { Search, Trophy } from "lucide-react";

export type GoalsViewMode = "tree" | "flat";

type RenderGoalsProps = {
  /** Tree mode: the roots to draw. Flat mode: every goal to draw. */
  goals: goal[];
  /** The whole list, so children and parents can be looked up for any card. */
  allGoals?: goal[];
  viewMode?: GoalsViewMode;
  /** Roots that only passed the filter through a sub-goal: drawn dimmed. */
  dimmedIds?: Set<string>;
  onAddSubGoal?: (parentId: string) => void;
  onOpenViewer?: (goalId: string) => void;
  /** Sobrescreve a mensagem de lista vazia (ex.: busca/filtro sem resultado). */
  emptyTitle?: string;
  /** Clears search and filters from the empty state. */
  onClearFilters?: () => void;
};

const byEndDate = (list: goal[]) =>
  [...list].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

function RenderGoals({
  goals,
  allGoals,
  viewMode = "flat",
  dimmedIds,
  onAddSubGoal,
  onOpenViewer,
  emptyTitle,
  onClearFilters,
}: RenderGoalsProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const all = allGoals ?? goals;
  // The dashboard links here with ?goal=<id>: the list scrolls to it and highlights
  // it, otherwise the user lands in a grid and has to hunt for the goal just tapped.
  const [searchParams] = useSearchParams();
  const focusedId = searchParams.get("goal");

  // In tree mode a sub-goal has no card of its own, so a link to one lands on the
  // card of its main goal, with the sub-goal list already open.
  const focusedRootId = useMemo(() => {
    if (!focusedId || viewMode !== "tree") return focusedId;
    const chain = ancestorsOf(all, focusedId);
    return chain.length ? chain[chain.length - 1].id : focusedId;
  }, [all, focusedId, viewMode]);

  //When open the page
  useEffect(() => {
      dispatch(editModeEnter(false));
  }, []);

  useEffect(() => {
      if (!focusedRootId) return;
      const node = document.getElementById(`goal-${focusedRootId}`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedRootId, goals]);

  const parentNameOf = (g: goal) => (g.parentId ? all.find((p) => p.id === g.parentId)?.name : undefined);

  return (
    // 3 columns on desktop, 1 on mobile — a scannable grid, no side-by-side form.
    <div className="grid grid-cols-1 items-start gap-4 text-text md:grid-cols-2 lg:grid-cols-3">
      {goals.length > 0 ? (
        goals.map((g) => {
          const isTree = viewMode === "tree";
          const subGoals = isTree ? byEndDate(childrenOf(all, g.id)) : [];
          const dimmed = dimmedIds?.has(g.id) ?? false;
          return (
          <div
            key={g.id}
            id={`goal-${g.id}`}
            className={`rounded-card transition-shadow duration-500 ${
              focusedRootId === g.id ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
            } ${dimmed ? "opacity-60" : ""}`}
          >
            <GoalBox
              id={g.id}
              title={g.name}
              iconId={g.iconId}
              description={g.description || ""}
              targetValue={g.targetValue}
              unit={g.unit}
              currentValue={g.currentValue}
              complete={g.complete}
              categories={g.categories}
              motivation={g.motivation || ""}
              startDate={g.startDate}
              endDate={g.endDate}
              xpReward={g.xpReward}
              status={g.status}
              term={g.term}
              parentId={g.parentId ?? null}
              subGoals={subGoals}
              allGoals={all}
              depth={depthOf(all, g.id)}
              onAddSubGoal={onAddSubGoal}
              onOpenViewer={onOpenViewer}
              parentName={isTree ? undefined : parentNameOf(g)}
              initialChildrenOpen={Boolean(focusedId && focusedId !== g.id && focusedRootId === g.id)}
            />
          </div>
          );
        })
      ) : (
        emptyTitle ? (
        <EmptyState
          icon={<Search size={20} aria-hidden="true" />}
          title={emptyTitle}
          description={t("NoResultsDescription")}
          actionLabel={onClearFilters ? t("ClearFilters") : undefined}
          onAction={onClearFilters}
          variant="ghost"
        />
      ) : (
        <EmptyState
          icon={<Trophy size={20} aria-hidden="true" />}
          title={t("0GoalsTitle")}
          description={t("Start creating amazing goals to track your progress!")}
        />
      )
      )}
    </div>
  );
}

export default RenderGoals;
