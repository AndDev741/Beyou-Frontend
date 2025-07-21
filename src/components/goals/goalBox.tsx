import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { goal as GoalType } from "../../types/goals/goalType";
import DeleteModal from "../DeleteModal";
import getGoals from "../../services/goals/getGoals";
import deleteGoal from "../../services/goals/deleteGoal";
import increaseIcon from '../../assets/categories/increaseIcon.svg'
import decreaseIcon from '../../assets/categories/decreaseIcon.svg'
import inProgressIcon from '../../assets/inProgress.svg';
import notStartedIcon from '../../assets/Not Started Icon.svg';
import completedIcon from '../../assets/Completed Icon.svg';
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
import { IconObject } from "../../types/icons/IconObject";
import iconSearch from "../icons/iconsSearch";
import CategoryNameAndIcon from "../habits/categoryNameAndIcon";

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
  const [Icon, setIcon] = useState<IconObject>();
  const [expanded, setExpanded] = useState(false);
  const [expandendIcon, setExpandedIcon] = useState(increaseIcon)
  const [statusIcon, setStatusIcon] = useState(notStartedIcon);
  const [termPhrase, setTermPhrase] = useState("");
  const [statusPhrase, setStatusPhrase] = useState("");

  const handleExpanded = () => {
    setExpanded(!expanded);
    expanded ? setExpandedIcon(increaseIcon) : setExpandedIcon(decreaseIcon);
  }
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

  useEffect(() => {
    const response = iconSearch(iconId);
    setIcon(response);

    switch(term) {
      case "SHORT_TERM" :
        setTermPhrase(t('Short Term'));
        break;
      case "MEDIUM_TERM" :
        setTermPhrase(t('Medium Term'));
        break;
      case "LONG_TERM" :
        setTermPhrase(t('Long Term'));
        break;
      default:
        break;
    }

    switch(status){
      case "NOT_STARTED" :
        setStatusPhrase(t('Not Started'));
        setStatusIcon(notStartedIcon);
        break;
      case "IN_PROGRESS" :
        setStatusPhrase(t('In Progress'));
        setStatusIcon(inProgressIcon);
        break;
      case "COMPLETED" :
        setStatusPhrase(t('Completed'));
        setStatusIcon(completedIcon);
        break;
      default:
        break;
    }

  }, [iconId, term, status]);

  return (
    <div className="flex relative flex-col justify-between border-blueMain border-[1px] rounded-md p-2 m-1 w-[90vw] md:w-[80vwpx] lg:w-[430px]">
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <p className="text-blueMain text-[34px]">
              {Icon !== undefined ? <Icon.IconComponent/> : null}
          </p>
          <h2 className={`text-2xl ml-1 font-semibold ${expanded ? "line-clamp-none" : "line-clamp-1"}`}>{title}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <img className="w-[30px] cursor-pointer"
            alt={t('ExpandBoxImgAlt')}
            src={expandendIcon}
            onClick={handleExpanded}
          />
        </div>
      </div>
      <div className={`${expanded ? "line-clamp-none" : "line-clamp-2"} leading-tight my-1`}>
        <p>{description}</p>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xl font-semibold">{termPhrase}</p>
        <div className="flex items-center">
          <img className="w-[30px] mr-1" alt={t('InProgressImgAlt')} src={statusIcon} />
          <p className="text-xl font-semibold">{statusPhrase}</p>
        </div>
      </div>
      
      <div className={`${expanded ? "flex flex-col items-center" : "hidden"}`}>

        <div className="w-full flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <p className="text-lg">{t('Start Date')}:</p>
            <p className="text-gray-600">{startDate.toString()}</p>
          </div>

          <div className="flex flex-col text-end">
            <p className="text-lg">{t('End Date')}:</p>
            <p className="text-gray-600">{endDate.toString()}</p>
          </div>
        </div>

        <div className="w-full flex items-start justify-between mt-2">
          <div className={`flex flex-col`}>
                <h4 className="font-semibold text-lg">{t('Categories')}:</h4>
                <div className="flex flex-col">
                    {categories.map((category, index) => (
                    <CategoryNameAndIcon key={index}
                    name={category.name} iconId={category.iconId}/>
                    ))}
                </div>
            </div>

          <div className={`${motivation ? "flex flex-col text-end" : "hidden"}`}>
            <p className="text-lg">{t('Motivation')}:</p>
            <p className="text-gray-600 ">{motivation}</p>
          </div>
        </div>

        <div className="w-full flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <p className="text-lg">{t('Actual Progress')}:</p>
            <p className="text-gray-600">{currentValue} {unit}</p>
          </div>

          <div className="flex flex-col text-end">
            <p className="text-lg">{t('Target Value')}:</p>
            <p className="text-gray-600 ">{targetValue} {unit}</p>
          </div>
        </div>

        <button onClick={handleEditMode} className="bg-blueMain text-white px-4 py-1 rounded">
          {t("Edit")}
        </button>
        <div className="my-1"></div>
        <button onClick={() => setOnDelete(true)} className="bg-red-600 text-white px-4 py-1 rounded">
          {t("Delete")}
        </button>
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
    </div>
  );
}

export default GoalBox;