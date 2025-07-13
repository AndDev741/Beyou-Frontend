import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button";
import GenericInput from "../inputs/genericInput";
import DescriptionInput from "../inputs/descriptionInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import createGoal from "../../services/goals/createGoal";
import getGoals from "../../services/goals/getGoals";
import { goal as GoalType } from "../../types/goals/goalType";

type Props = {
  setGoals: React.Dispatch<React.SetStateAction<GoalType[]>>;
};

function CreateGoal({ setGoals }: Props) {
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState(0);
  const [unit, setUnit] = useState("");
  const [motivation, setMotivation] = useState("");
  const [categoriesIdList, setCategoriesIdList] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [xpReward, setXpReward] = useState(0);
  const [status, setStatus] = useState("");
  const [term, setTerm] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const categoryId = categoriesIdList[0] || "";
    const response = await createGoal(
      title,
      description,
      targetValue,
      unit,
      0,
      false,
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
        setTitle("");
        setDescription("");
        setTargetValue(0);
        setUnit("");
        setMotivation("");
        setCategoriesIdList([]);
        setStartDate("");
        setEndDate("");
        setXpReward(0);
        setStatus("");
        setTerm("");
      }
    } else if (response.error) {
      setErrorMessage(response.error);
    } else if (response.validation) {
      setErrorMessage(response.validation);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center text-3xl font-semibold">
        <h2>{t("Create Goal")}</h2>
      </div>
      <form onSubmit={handleCreate} className="flex flex-col mt-4">
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
          chosenCategories={null}
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
        <div className="flex justify-center mt-4">
          <Button text={t("Create")} />
        </div>
      </form>
    </div>
  );
}

export default CreateGoal;