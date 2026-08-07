import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { goal } from "@beyou/types/goals/goalType";
import GoalBox from "./goalBox";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { editModeEnter } from "@beyou/state/goal/editGoalSlice";
import EmptyState from "../EmptyState";
import { Search, Trophy } from "lucide-react";

type RenderGoalsProps = {
  goals: goal[];
  /** Sobrescreve a mensagem de lista vazia (ex.: busca/filtro sem resultado). */
  emptyTitle?: string;
  /** Limpa busca e filtros a partir do estado vazio. */
  onClearFilters?: () => void;
};

function RenderGoals({ goals, emptyTitle, onClearFilters }: RenderGoalsProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  // O dashboard linka para cá com ?goal=<id>: a lista rola até ela e destaca,
  // senão o usuário cai numa grade e tem de procurar a meta que acabou de tocar.
  const [searchParams] = useSearchParams();
  const focusedId = searchParams.get("goal");

  //When open the page
  useEffect(() => {
      dispatch(editModeEnter(false));
  }, []);

  useEffect(() => {
      if (!focusedId) return;
      const node = document.getElementById(`goal-${focusedId}`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedId, goals]);

  return (
    // 3 colunas no desktop, 1 no mobile — grade escaneável, sem formulário ao lado.
    <div className="grid grid-cols-1 items-start gap-4 text-text md:grid-cols-2 lg:grid-cols-3">
      {goals.length > 0 ? (
        goals.map((g) => (
          <div
            key={g.id}
            id={`goal-${g.id}`}
            className={`rounded-card transition-shadow duration-500 ${
              focusedId === g.id ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
            }`}
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
            />
          </div>
        ))
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
