import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { goal as GoalType } from "../../types/goals/goalType";
import DeleteModal from "../DeleteModal";
import getGoals from "../../services/goals/getGoals";
import deleteGoal from "../../services/goals/deleteGoal";
import {
  editModeEnter,
  editGoalIdEnter,
  editTitleEnter,
  editDescriptionEnter,
  editTargetValueEnter,
  editUnitEnter,
  editCurrentValueEnter,
  editCompleteEnter,
  editCategoryEnter,
  editMotivationEnter,
  editStartDateEnter,
  editEndDateEnter,
  editXpRewardEnter,
  editStatusEnter,
  editTermEnter,
  editIconIdEnter,
} from "../../redux/goal/editGoalSlice";

type GoalBoxProps = {
  id: string;
  title: string;
  iconId: string;
  description: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: GoalType["categories"];
  motivation: string;
  startDate: Date;
  endDate: Date;
  xpReward: number;
  status: string;
  term: string;
  setGoals: React.Dispatch<React.SetStateAction<GoalType[]>>;
};

function GoalBox({
  id,
  title,
  iconId,
  description,
  targetValue,
  unit,
  currentValue,
  complete,
  categories,
  motivation,
  startDate,
  endDate,
  xpReward,
  status,
  term,
  setGoals,
}: GoalBoxProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [onDelete, setOnDelete] = useState(false);
  console.log("ICONID IN BOX => ", iconId)
  function handleEditMode() {
    dispatch(editModeEnter(true));
    dispatch(editGoalIdEnter(id));
    dispatch(editTitleEnter(title));
    dispatch(editIconIdEnter(iconId));
    dispatch(editDescriptionEnter(description));
    dispatch(editTargetValueEnter(targetValue));
    dispatch(editUnitEnter(unit));
    dispatch(editCurrentValueEnter(currentValue));
    dispatch(editCompleteEnter(complete));
    dispatch(editCategoryEnter(categories));
    dispatch(editMotivationEnter(motivation));
    dispatch(editStartDateEnter(startDate));
    dispatch(editEndDateEnter(endDate));
    dispatch(editXpRewardEnter(xpReward));
    dispatch(editStatusEnter(status));
    dispatch(editTermEnter(term));
  }

  return (
    <div className="flex flex-col justify-between border-blueMain border-[1px] rounded-md p-2 m-1 w-[46vw] md:w-[350px] lg:w-[230px]">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="flex items-center space-x-2">
          <button onClick={handleEditMode} className="bg-blueMain text-white px-4 py-1 rounded">
            {t("Edit")}
          </button>
          <button onClick={() => setOnDelete(true)} className="bg-red-600 text-white px-4 py-1 rounded">
            {t("Delete")}
          </button>
        </div>
      </div>
      <p className="text-gray-700 mt-2">{description}</p>
      <p className="mt-2">
        {currentValue}/{targetValue} {unit}
      </p>
      <DeleteModal
        objectId={id}
        onDelete={onDelete}
        setOnDelete={setOnDelete}
        t={t}
        name={title}
        setObjects={setGoals}
        deleteObject={deleteGoal}
        getObjects={getGoals}
        deletePhrase={t("ConfirmDeleteOfGoalPhrase")}
      />
    </div>
  );
}

export default GoalBox;