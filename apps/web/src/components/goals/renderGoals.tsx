import { useTranslation } from "react-i18next";
import { goal } from "@beyou/types/goals/goalType";
import GoalBox from "./goalBox";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { editModeEnter } from "../../redux/goal/editGoalSlice";
import EmptyState from "../EmptyState";

type RenderGoalsProps = {
  goals: goal[];
};

function RenderGoals({ goals }: RenderGoalsProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  //When open the page
  useEffect(() => {
      dispatch(editModeEnter(false));
  }, []); 
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 text-secondary">
      {goals.length > 0 ? (
        goals.map((g) => (
          <div key={g.id} className="lg:mx-1">
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
        <EmptyState emoji="🎯" title={t("Start creating amazing goals to track your progress!")} />
      )}
    </div>
  );
}

export default RenderGoals;
