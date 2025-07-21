import { useEffect, useState } from "react";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import { goal } from "../../types/goals/goalType";
import RenderGoals from "../../components/goals/renderGoals";
import getGoals from "../../services/goals/getGoals";
import { t } from "i18next";
import CreateGoal from "../../components/goals/createGoal";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import EditGoal from "../../components/goals/editGoal";

function Goals() {
  useAuthGuard();

  const isEditMode = useSelector((state: RootState) => state.editGoal.editMode);
  const [goals, setGoals] = useState<goal[]>([]);

  useEffect(() => {
    const fetchGoals = async () => {
      const response = await getGoals(t);
      if (Array.isArray(response.success)) {
        setGoals(response.success);
      }
    };
    fetchGoals();
  }, []);

  return (
    <div className="lg:flex flex-col items-center w-full">
      <Header pageName="Your Goals" />
      <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] p-2">
        <div className="lg:w-[60%]">
          <RenderGoals goals={goals} setGoals={setGoals} />
        </div>
        <div className="lg:mr-12 mt-4">
          <div className={`${isEditMode ? "hidden" : "block"}`}>
            <CreateGoal setGoals={setGoals} />
          </div>
          <div className={`${isEditMode ? "block" : "hidden"}`}>
            <EditGoal setGoals={setGoals} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Goals;