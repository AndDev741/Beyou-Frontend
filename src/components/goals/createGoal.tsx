import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button";
import DescriptionInput from "../inputs/descriptionInput";
import ChooseCategories from "../inputs/chooseCategory/chooseCategories";
import createGoal from "../../services/goals/createGoal";
import getGoals from "../../services/goals/getGoals";
import { goal as GoalType } from "../../types/goals/goalType";
import GenericInput from "../inputs/genericInput";
import IconsBox from "../inputs/iconsBox";
import SelectorInput from "../inputs/SelectorInput";

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
  const [actualProgress, setActualProgress] = useState(0);
  const [categoriesIdList, setCategoriesIdList] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [xpReward, setXpReward] = useState(0);
  const [status, setStatus] = useState(1);
  const [term, setTerm] = useState(1);

  const [errorMessage, setErrorMessage] = useState("");
  const [iconError, setIconError] = useState("");

  const [search, setSearch] = useState("");

  console.log("CATEGORIES ID => ", categoriesIdList)


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const response = await createGoal(
      title,
      description,
      targetValue,
      unit,
      actualProgress,
      categoriesIdList,
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
        setTitle("");
        setDescription("");
        setTargetValue(0);
        setUnit("");
        setMotivation("");
        setCategoriesIdList([]);
        setStartDate("");
        setEndDate("");
        setXpReward(0);
        setStatus(1);
        setTerm(1);
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
              name="TargetValue"
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
              title="Status"
              value={status}
              valuesToSelect={[
                {
                  title: "Not Started",
                  value: 1,
                },
                {
                  title: "In Progress",
                  value: 2,
                },
                {
                  title: "Completed",
                  value: 3,
                }
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
              title="Term"
              value={term}
              setValue={setTerm}
              valuesToSelect={[
                {
                  title: "Short Term",
                  value: 1,
                },
                {
                  title: "Medium Term",
                  value: 2,
                },
                {
                  title: "Long Term",
                  value: 3,
                }
              ]}
              t={t}
              errorPhrase=""
            />

          </div>
        </div>

        <ChooseCategories
          categoriesIdList={categoriesIdList}
          setCategoriesIdList={setCategoriesIdList}
          errorMessage={""}
          chosenCategories={null}
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