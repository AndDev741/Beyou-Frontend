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
import { MdCalendarMonth } from "react-icons/md";
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
import { ProgressRing } from "../progressRing";
import { MdOutlineAlbum } from "react-icons/md";

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

    switch (term) {
      case "SHORT_TERM":
        setTermPhrase(t('Short Term'));
        break;
      case "MEDIUM_TERM":
        setTermPhrase(t('Medium Term'));
        break;
      case "LONG_TERM":
        setTermPhrase(t('Long Term'));
        break;
      default:
        break;
    }

    switch (status) {
      case "NOT_STARTED":
        setStatusPhrase(t('Not Started'));
        setStatusIcon(notStartedIcon);
        break;
      case "IN_PROGRESS":
        setStatusPhrase(t('In Progress'));
        setStatusIcon(inProgressIcon);
        break;
      case "COMPLETED":
        setStatusPhrase(t('Completed'));
        setStatusIcon(completedIcon);
        break;
      default:
        break;
    }

  }, [iconId, term, status]);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short", // "Jan", "Feb", "Mar"...
      day: "numeric"  // 1, 2, 3...
    });
  }

  return (
    <div className="flex relative flex-col justify-between border-blueMain border-[1px] rounded-md p-2 m-1 w-[90vw] md:w-[80vwpx] lg:w-[430px] md:min-h-[262px]">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-start">
            <p className="text-blueMain text-[34px]">
              {Icon !== undefined ? <Icon.IconComponent /> : null}
            </p>
            <h2 className={`text-xl ml-1 font-semibold ${expanded ? "line-clamp-none" : "line-clamp-1"}`}>{title}</h2>
          </div>
          <div className={`${expanded ? "line-clamp-none" : "line-clamp-2"} leading-tight my-1 text-descriptionColor`}>
            <p>{description}</p>
          </div>
          <p className="text-darkGray text-sm italic line-clamp-2">{t('Motivation')}: {motivation}</p>
        </div>
        <div className="flex items-center space-x-2">
          <ProgressRing progress={currentValue / targetValue * 100} size="md" className="flex-shrink-0" />
        </div>
      </div>

      <div className="w-full flex items-start justify-between my-1">
        <div className="flex flex-wrap">
          {categories.map((category, index) => (
            <>
              <CategoryNameAndIcon key={index}
                name={category.name} iconId={category.iconId} />
              <p className={`${index === categories.length - 1 ? "invisible" : "mr-1"}`}>,</p>
            </>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <div className="flex items-center gap-1 text-darkGray">
          <MdCalendarMonth />
          <p>{formatDate(startDate.toString())}</p>
          <p>-</p>
          <p>{formatDate(endDate.toString())}</p>
        </div>
        <div className="flex items-center gap-1 text-darkGray">
          <MdOutlineAlbum />
          <p>{currentValue}</p>
          <p> / </p>
          <p>{targetValue} {unit}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2">
        <p className="text-lg font-medium">{termPhrase}</p>
        <div className="flex items-center font-medium">
          <img className="w-[30px] mr-1" alt={t('InProgressImgAlt')} src={statusIcon} />
          <p className="text-lg font-medium">{statusPhrase}</p>
        </div>
      </div>
      <div className={`flex justify-between items-center my-2`}>

        <button onClick={handleEditMode} className="bg-blueMain text-white px-4 py-1 rounded cursor-pointer">
          {t("Edit")}
        </button>
        <div className="my-1"></div>
        <button onClick={() => setOnDelete(true)} className="bg-red-600 text-white px-4 py-1 rounded cursor-pointer">
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