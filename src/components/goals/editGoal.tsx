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
  editStatusEnter,
  editTermEnter,
} from "../../redux/goal/editGoalSlice";
import { goal as GoalType } from "../../types/goals/goalType";
import SelectorInput from "../inputs/SelectorInput";
import IconsBox from "../inputs/iconsBox";
import category from "../../types/category/categoryType";

type Props = {
  setGoals: React.Dispatch<React.SetStateAction<GoalType[]>>;
};

function EditGoal({ setGoals }: Props) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const goalId = useSelector((state: RootState) => state.editGoal.goalId);
  const titleEdit = useSelector((state: RootState) => state.editGoal.title);
  const iconId = useSelector((state: RootState) => state.editGoal.iconId);
  console.log("ICON ID => ", iconId)
  const descriptionEdit = useSelector((state: RootState) => state.editGoal.description);
  const targetValueEdit = useSelector((state: RootState) => state.editGoal.targetValue);
  const unitEdit = useSelector((state: RootState) => state.editGoal.unit);
  const currentValueEdit = useSelector((state: RootState) => state.editGoal.currentValue);
  const completeEdit = useSelector((state: RootState) => state.editGoal.complete);
  const categories = useSelector((state: RootState) => state.editGoal.categories);
  console.log(categories)
  const motivationEdit = useSelector((state: RootState) => state.editGoal.motivation);
  const startDateEdit = useSelector((state: RootState) => state.editGoal.startDate);
  const endDateEdit = useSelector((state: RootState) => state.editGoal.endDate);
  const statusEdit = useSelector((state: RootState) => state.editGoal.status);
  const termEdit = useSelector((state: RootState) => state.editGoal.term);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState(0);
  const [unit, setUnit] = useState("");
  const [categoriesList, setcategoriesList] = useState<string[]>([]);
  const [chosenCategories, setChosenCategories] = useState<category[]>([]);
  const [motivation, setMotivation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [term, setTerm] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [actualProgress, setActualProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [iconError, setIconError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setTitle(titleEdit);
    setSelectedIcon(iconId);
    setDescription(descriptionEdit);
    setTargetValue(targetValueEdit);
    setActualProgress(currentValueEdit);
    setUnit(unitEdit);
    setChosenCategories(categories);
    setMotivation(motivationEdit);
    setStartDate(startDateEdit);
    setEndDate(endDateEdit);
    setStatus(statusEdit);
    setTerm(termEdit);
    setSearch(iconId);
  }, [
    titleEdit,
    descriptionEdit,
    targetValueEdit,
    unitEdit,
    categories,
    motivationEdit,
    startDateEdit,
    endDateEdit,
    statusEdit,
    termEdit,
  ]);

  const handleCancel = () => {
    dispatch(editModeEnter(false));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const response = await editGoal(
      goalId,
      title,
      selectedIcon,
      description,
      targetValue,
      unit,
      actualProgress,
      completeEdit,
      categoriesList,
      motivation,
      startDate,
      endDate,
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
    <div className="bg-background text-secondary transition-colors duration-200 rounded-lg p-4 lg:p-6">
      <div className="flex items-center justify-center text-3xl font-semibold">
        <h2>{t("Edit Goal")}</h2>
      </div>
      <form onSubmit={handleEdit} className="flex flex-col mt-4">
        <div className='flex md:items-start md:flex-row justify-center'>
          <div className='flex flex-col md:items-start md:justify-start'>
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
              minH={178}
              minHSmallScreen={102}
              t={t}
            />
            <GenericInput
              name="Target Value"
              type="number"
              placeholder="GoalTargetValuePlaceholder"
              data={targetValue}
              setData={setTargetValue}
              t={t}
              dataError=""
            />

            <GenericInput
              name="Motivation"
              placeholder="GoalMotivationPlaceholder"
              data={motivation}
              setData={setMotivation}
              dataError={""}
              t={t}
            />
            <GenericInput
              name="Start Date"
              placeholder="GoalStartDatePlaceholder"
              t={t}
              dataError={""}
              type="date"
              data={startDate}
              setData={setStartDate}
            />
            <SelectorInput
              title={t("Status")}
              value={status}
              valuesToSelect={[
                { title: t("Not Started"), value: "NOT_STARTED" },
                { title: t("In Progress"), value: "IN_PROGRESS" },
                { title: t("Completed"), value: "COMPLETED" }
              ]}
              setValue={setStatus}
              errorPhrase={""}
              t={t}
            />
          </div>

          <div className='mx-2'></div>

          <div className='flex flex-col'>
            <IconsBox
              search={search}
              setSearch={setSearch}
              iconError={iconError}
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
              t={t}
              minLgH={272}
              minHSmallScreen={200}
            />
            <GenericInput
              name="Unit"
              placeholder="GoalUnitPlaceholder"
              data={unit}
              setData={setUnit}
              dataError={""}
              t={t}
            />
            <GenericInput
              name="Actual Progress"
              type="number"
              placeholder="Progress"
              data={actualProgress}
              setData={setActualProgress}
              dataError={""}
              t={t}
            />

            <GenericInput
              name="End Date"
              placeholder="End date"
              t={t}
              dataError={""}
              type="date"
              data={endDate}
              setData={setEndDate}
            />
            <SelectorInput
              title={t("Term")}
              value={term}
              setValue={setTerm}
              valuesToSelect={[
                { title: t("Short Term"), value: "SHORT_TERM" },
                { title: t("Medium Term"), value: "MEDIUM_TERM" },
                { title: t("Long Term"), value: "LONG_TERM" }
              ]}
              t={t}
              errorPhrase=""
            />

          </div>
        </div>

        <ChooseCategories
          categoriesIdList={categoriesList}
          setCategoriesIdList={setcategoriesList}
          errorMessage={""}
          chosenCategories={chosenCategories}
        />

        <p className="text-error text-center mt-2">{errorMessage}</p>
        <div className="flex items-center justify-evenly mt-4">
          <Button text={t("Cancel")} mode='cancel' size='medium' onClick={handleCancel}/>
          <Button text={t("Edit")} mode='create' size='medium' />
        </div>
      </form>
    </div>
  );
}

export default EditGoal;
