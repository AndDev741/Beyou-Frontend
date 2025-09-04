import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";
import { sortGoalsByTime } from "./sortGoalsByTime";
import { useDragScroll } from "../../../hooks/useDragScroll";
import { useEffect, useState } from "react";
import iconSearch from "../../icons/iconsSearch";
import { IconObject } from "../../../types/icons/IconObject";
import { goal } from "../../../types/goals/goalType";
import inProgressIcon from '../../../assets/inProgress.svg';
import notStartedIcon from '../../../assets/Not Started Icon.svg';
import completedIcon from '../../../assets/Completed Icon.svg';
import arrowIncreaseIcon from '../../../assets/arrowIncrease.svg';
import markGoalAsComplete from "../../../services/goals/markGoalAsComplete";
import getGoals from "../../../services/goals/getGoals";
import { useDispatch } from "react-redux";
import { enterGoals } from "../../../redux/goal/goalsSlice";


export default function GoalsTab() {
    const { t } = useTranslation();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const sortedGoals = sortGoalsByTime(goals || []);
    const scrollContainer = useDragScroll();

    return (
        <div className="lg:m-4 space-y-4">
            <h2 className="text-center text-3xl font-semibold lg:text-start">{t('Goals')}</h2>
            <div className="flex overflow-x-auto flex-nowrap space-x-4 pb-4">
                <div
                    className="flex overflow-x-auto flex-nowrap space-x-4 p-2 active:cursor-grabbing"
                    ref={scrollContainer.ref}
                    onMouseDown={scrollContainer.onMouseDown}
                    onMouseLeave={scrollContainer.onMouseLeave}
                    onMouseUp={scrollContainer.onMouseUp}
                    onMouseMove={scrollContainer.onMouseMove}
                    onTouchStart={scrollContainer.onTouchStart}
                    onTouchMove={scrollContainer.onTouchMove}
                >
                    {/* TODO: Traduzir os títulos usando a função t() */}
                    <GoalSection title="Esta Semana" goals={sortedGoals.thisWeek} />
                    <GoalSection title="Este Mês" goals={sortedGoals.thisMonth} />
                    <GoalSection title="Este Ano" goals={sortedGoals.thisYear} />
                    <GoalSection title="Futuras" goals={sortedGoals.beyond} />
                    <GoalSection title="Metas Passadas" goals={sortedGoals.past} />
                </div>
            </div>
        </div>


    );
}

function GoalSection({ title, goals }: { title: string, goals: any[] }) {
    if (goals.length === 0) return null;

    
    return (
        <div className="flex-shrink-0 w-80 border border-blueMain rounded-md p-2">
            <h3 className="text-2xl font-semibold mb-2">{title}</h3>
            <ul className="space-y-2">
                {goals.map(goal => (
                    <GoalBox key={goal.id} goal={goal as goal} />
                ))}
            </ul>
        </div>
    );
}

function GoalBox({goal}: {goal: goal}) {
    const dispatch = useDispatch();
    const {t, i18n} = useTranslation();
    const [Icon, setIcon] = useState<IconObject>();

    const [statusIcon, setStatusIcon] = useState(notStartedIcon);
    const [termPhrase, setTermPhrase] = useState("");
    const [statusPhrase, setStatusPhrase] = useState("");
    useEffect(() => {
        const response = iconSearch(goal.iconId);
        setIcon(response);

        switch(goal.term) {
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

        switch(goal.status){
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

  }, [goal.iconId, goal.term, goal.status]);

    const completeTask = async (id: string) => {
        await markGoalAsComplete(id, t);
        const goals = await getGoals(t);
        dispatch(enterGoals(goals.success));
    }

    return (
        <div className="p-4 border border-blueMain rounded-md shadow-sm">
            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={goal.complete}
                    onChange={() => completeTask(goal.id)}
                    className="accent-[#0082E1] border-blueMain w-7 h-7 rounded-xl cursor-pointer"
                />
                <p className="text-blueMain text-[30px]">
                    {Icon !== undefined ? <Icon.IconComponent/> : null}
                </p>
                <div className="font-medium line-clamp-2">{goal.name}</div>
            </div>

            <div className="text-sm text-gray-500 line-clamp-2 my-1.5">{goal.description}</div>


            <div className="w-full flex items-center justify-between my-2">
                <div className="flex flex-col">
                    <p className="text-md">{t('Actual Progress')}:</p>
                    <div className="flex items-center space-x-2 mt-2">
                        <p className="text-gray-600 text-sm">{goal.currentValue} {goal.unit}</p>
                        <img src={arrowIncreaseIcon} 
                        className="w-[20px] cursor-pointer hover:scale-110" />
                    </div>
                </div>

                <div className="flex flex-col text-end">
                    <p className="text-md">{t('Target Value')}:</p>
                    <p className="text-gray-600 text-sm mt-2">{goal.targetValue} {goal.unit}</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <p className="font-medium">{termPhrase}</p>
                <div className="flex items-center">
                    <img className="w-[30px] mr-1" alt={t('InProgressImgAlt')} src={statusIcon} />
                    <p className="font-medium">{statusPhrase}</p>
                </div>
            </div>

            
        </div>
    );
}
