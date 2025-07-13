import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { useTranslation } from "react-i18next";
import Button from "../Button";
import GenericInput from "../inputs/genericInput";
import DescriptionInput from "../inputs/descriptionInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import editGoal from "../../services/goals/editGoal";
import getGoals from "../../services/goals/getGoals";
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
} from "../../redux/goal/editGoalSlice";
import { goal as GoalType } from "../../types/goals/goalType";

type Props = {
  setGoals: React.Dispatch<React.SetStateAction<GoalType[]>>;
};

function EditGoal({ setGoals }: Props) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const goalId = useSelector((state: RootState) => state.editGoal.goalId);
  const titleEdit = useSelector((state: RootState) => state.editGoal.title);
  const descriptionEdit = useSelector((state: RootState) => state.editGoal.description);
  const targetValueEdit = useSelector((state: RootState) => state.editGoal.targetValue);
  const unitEdit = useSelector((state: RootState) => state.editGoal.unit);
  const currentValueEdit = useSelector((state: RootState) => state.editGoal.currentValue);
  const completeEdit = useSelector((state: RootState) => state.editGoal.complete);
  const categoryEdit = useSelector((state: RootState) => state.editGoal.category);
  const motivationEdit = useSelector((state: RootState) => state.editGoal.motivation);
  const startDateEdit = useSelector((state: RootState) => state.editGoal.startDate);
  const endDateEdit = useSelector((state: RootState) => state.editGoal.endDate);
  const xpRewardEdit = useSelector((state: RootState) => state.editGoal.xpReward);
  const statusEdit = useSelector((state: RootState) => state.editGoal.status);
  const termEdit = useSelector((state: RootState) => state.editGoal.term);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState(0);
  const [unit, setUnit] = useState("");
  const [categoriesIdList, setCategoriesIdList] = useState<string[]>([]);
  const [motivation, setMotivation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [xpReward, setXpReward] = useState(0);
  const [status, setStatus] = useState("");
  const [term, setTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setTitle(titleEdit);
    setDescription(descriptionEdit);
    setTargetValue(targetValueEdit);
    setUnit(unitEdit);
    setCategoriesIdList(categoryEdit ? [categoryEdit.id] : []);
    setMotivation(motivationEdit);
    setStartDate(startDateEdit);
    setEndDate(endDateEdit);
    setXpReward(xpRewardEdit);
    setStatus(statusEdit);
    setTerm(termEdit);
  }, [
    titleEdit,
    descriptionEdit,
    targetValueEdit,
    unitEdit,
    categoryEdit,
    motivationEdit,
    startDateEdit,
    endDateEdit,
    xpRewardEdit,
    statusEdit,
    termEdit,
  ]);

  const handleCancel = () => {
    dispatch(editModeEnter(false));
    dispatch(editGoalIdEnter(""));
    dispatch(editTitleEnter(""));
    dispatch(editDescriptionEnter(""));
    dispatch(editTargetValueEnter(0));
    dispatch(editUnitEnter(""));
    dispatch(editCurrentValueEnter(0));
    dispatch(editCompleteEnter(false));
    dispatch(editCategoryEnter(null));
    dispatch(editMotivationEnter(""));
    dispatch(editStartDateEnter(""));
    dispatch(editEndDateEnter(""));
    dispatch(editXpRewardEnter(0));
    dispatch(editStatusEnter(""));
    dispatch(editTermEnter(""));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const categoryId = categoriesIdList[0] || "";
    const response = await editGoal(
      goalId,
      title,
      description,
      targetValue,
      unit,
      currentValueEdit,
      completeEdit,
      categoryId,
      motivation,
      startDate,
      endDate,
      xpReward,
      status,
      term,
      t
    );
    if (response.success) {
      const newGoals = await getGoals(t);
      if (Array.isArray(newGoals.success)) {
        setGoals(newGoals.success);
      }
      handleCancel();
    } else if (response.validation) {
      setErrorMessage(response.validation);
    } else if (response.error) {
      setErrorMessage(response.error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center text-3xl font-semibold">
        <h2>{t("Edit Goal")}</h2>
      </div>
      <form onSubmit={handleEdit} className="flex flex-col mt-4">
        <GenericInput
          name="Title"
          placeholder="GoalTitlePlaceholder"
          data={title}
          setData={setTitle}
          dataError={""}
          t={t}
        />
        <DescriptionInput
          description={description}
          setDescription={setDescription}
          placeholder="GoalDescriptionPlaceholder"
          descriptionError={""}
          minH={0}
          t={t}
        />
        <div className="flex flex-col lg:flex-row lg:space-x-4">
          <div className="flex flex-col">
            <label className="text-2xl mt-2">{t("Target Value")}</label>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="border border-blueMain rounded p-1 mt-1"
            />
          </div>
          <GenericInput
            name="Unit"
            placeholder="GoalUnitPlaceholder"
            data={unit}
            setData={setUnit}
            dataError={""}
            t={t}
          />
        </div>
        <GenericInput
          name="Motivation"
          placeholder="GoalMotivationPlaceholder"
          data={motivation}
          setData={setMotivation}
          dataError={""}
          t={t}
        />
        <ChooseCategories
          categoriesIdList={categoriesIdList}
          setCategoriesIdList={setCategoriesIdList}
          errorMessage={""}
          chosenCategories={categoryEdit ? [categoryEdit] : null}
        />
        <div className="flex flex-col lg:flex-row lg:space-x-4 mt-2">
          <div className="flex flex-col">
            <label className="text-2xl">{t("Start Date")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-blueMain rounded p-1 mt-1"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-2xl">{t("End Date")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-blueMain rounded p-1 mt-1"
            />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:space-x-4 mt-2">
          <div className="flex flex-col">
            <label className="text-2xl">{t("XP Reward")}</label>
            <input
              type="number"
              value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))}
              className="border border-blueMain rounded p-1 mt-1"
            />
          </div>
          <GenericInput
            name="Status"
            placeholder="GoalStatusPlaceholder"
            data={status}
            setData={setStatus}
            dataError={""}
            t={t}
          />
        </div>
        <GenericInput
          name="Term"
          placeholder="GoalTermPlaceholder"
          data={term}
          setData={setTerm}
          dataError={""}
          t={t}
        />
        <p className="text-red-500 text-center mt-2">{errorMessage}</p>
        <div className="flex items-center justify-evenly mt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="w-[120px] h-[40px] bg-gray-500 text-white rounded hover:bg-gray-400"
          >
            {t("Cancel")}
          </button>
          <Button text={t("Edit")} />
        </div>
      </form>
    </div>
  );
}

export default EditGoal;