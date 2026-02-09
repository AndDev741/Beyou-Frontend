import { useEffect, useMemo } from "react";
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
import SortFilterBar, { SortOption } from "../../components/filters/SortFilterBar";
import {
  compareNumbers,
  compareStrings,
  getTimestamp,
  sortItems
} from "../../components/utils/sortHelpers";
import { goal } from "../../types/goals/goalType";
import { setViewSort } from "../../redux/viewFilters/viewFiltersSlice";

function Goals() {
  useAuthGuard();
  const dispatch = useDispatch();

  const isEditMode = useSelector((state: RootState) => state.editGoal.editMode);
  // const [goals, setGoals] = useState<goal[]>([]);
  const goals = useSelector((state: RootState) => state.goals.goals) || [];
  const sortBy = useSelector((state: RootState) => state.viewFilters.goals);

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

  const sortedGoals = useMemo(() => {
    switch (sortBy) {
      case "name-asc":
        return sortItems(goals, (a, b) => compareStrings(a.name, b.name));
      case "name-desc":
        return sortItems(goals, (a, b) => compareStrings(b.name, a.name));
      case "xp-desc":
        return sortItems(goals, (a, b) => compareNumbers(b.xpReward, a.xpReward));
      case "xp-asc":
        return sortItems(goals, (a, b) => compareNumbers(a.xpReward, b.xpReward));
      case "progress-desc":
        return sortItems(goals, (a, b) => compareNumbers(getProgress(b), getProgress(a)));
      case "progress-asc":
        return sortItems(goals, (a, b) => compareNumbers(getProgress(a), getProgress(b)));
      case "end-asc":
        return sortItems(goals, (a, b) =>
          compareNumbers(getTimestamp(a.endDate), getTimestamp(b.endDate))
        );
      case "end-desc":
        return sortItems(goals, (a, b) =>
          compareNumbers(getTimestamp(b.endDate), getTimestamp(a.endDate))
        );
      case "start-desc":
        return sortItems(goals, (a, b) =>
          compareNumbers(getTimestamp(b.startDate), getTimestamp(a.startDate))
        );
      case "start-asc":
        return sortItems(goals, (a, b) =>
          compareNumbers(getTimestamp(a.startDate), getTimestamp(b.startDate))
        );
      default:
        return goals;
    }
  }, [goals, sortBy]);

  const handleSortChange = (value: string) => {
    dispatch(setViewSort({ view: "goals", sortBy: value }));
  };

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
      <div className="lg:flex justify-center lg:justify-between lg:items-start items-center lg:w-[100%] mt-4 lg:px-6">
        <div className="w-full px-2">
          <SortFilterBar
            title={t("Goals overview")}
            description={t("Sort results")}
            options={sortOptions}
            value={sortBy}
            onChange={handleSortChange}
            quickValues={["name-asc", "progress-desc", "xp-desc"]}
            className="mb-4"
          />
          <RenderGoals goals={sortedGoals}/>
        </div>
        <div className="w-full">
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
