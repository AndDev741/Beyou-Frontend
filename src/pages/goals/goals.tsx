import { useEffect } from "react";
import Header from "../../components/header";
import useAuthGuard from "../../components/useAuthGuard";
import RenderGoals from "../../components/goals/renderGoals";
import getGoals from "../../services/goals/getGoals";
import { t } from "i18next";
import CreateGoal from "../../components/goals/createGoal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import EditGoal from "../../components/goals/editGoal";
import { enterGoals } from "../../redux/goal/goalsSlice";

function Goals() {
  useAuthGuard();
  const dispatch = useDispatch();

  const isEditMode = useSelector((state: RootState) => state.editGoal.editMode);
  // const [goals, setGoals] = useState<goal[]>([]);
  const goals = useSelector((state: RootState) => state.goals.goals);

  useEffect(() => {
    const fetchGoals = async () => {
      const response = await getGoals(t);
      if (Array.isArray(response.success)) {
        dispatch(enterGoals(response.success));
      }
    };
    fetchGoals();
  }, []);

  return (
    <div className="lg:flex flex-col items-center w-full bg-background text-secondary min-h-screen">
      <Header pageName="Your Goals" />
      <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] p-2">
        <div className="lg:w-[70%]">
          <RenderGoals goals={goals}/>
        </div>
        <div className="lg:mr-12 mt-4">
          <div className={`${isEditMode ? "hidden" : "block"}`}>
            <CreateGoal />
          </div>
          <div className={`${isEditMode ? "block" : "hidden"}`}>
            <EditGoal />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Goals;
