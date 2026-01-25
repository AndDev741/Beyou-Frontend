import { useTranslation } from "react-i18next";
import { goal } from "../../types/goals/goalType";
import GoalBox from "./goalBox";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { editModeEnter } from "../../redux/goal/editGoalSlice";

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
    <div className="flex flex-wrap md:items-start justify-center md:justify-between lg:justify-start text-secondary">
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
        <h2 className="text-primary font-semibold text-[30px] text-center lg:text-start lg:mt-12">
          {t("Start creating amazing goals to track your progress!")}
        </h2>
      )}
    </div>
  );
}

export default RenderGoals;
