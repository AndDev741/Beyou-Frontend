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
import { enterGoals, updateGoal } from "../../../redux/goal/goalsSlice";
import increaseCurrentValue from "../../../services/goals/increaseCurrentValue";
import GoalBox from "../../goals/goalBox";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";


export default function GoalsTab() {
    const { t } = useTranslation();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const sortedGoals = sortGoalsByTime(goals || []);
    const scrollContainer = useDragScroll();
    const dispatch = useDispatch();

    return (
        <div className="lg:p-4 space-y-4">
            <h2 className="text-center text-3xl font-semibold lg:text-start text-secondary">{t('Goals')}</h2>
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
                    <GoalSection title="Esta Semana" goals={sortedGoals.thisWeek} dispatch={dispatch}/>
                    <GoalSection title="Este Mês" goals={sortedGoals.thisMonth} dispatch={dispatch}/>
                    <GoalSection title="Este Ano" goals={sortedGoals.thisYear} dispatch={dispatch}/>
                    <GoalSection title="Futuras" goals={sortedGoals.beyond} dispatch={dispatch}/>
                    <GoalSection title="Metas Passadas" goals={sortedGoals.past} dispatch={dispatch} />
                </div>
            </div>
        </div>


    );
}

function GoalSection({ title, goals, dispatch }: { title: string, goals: goal[], dispatch: Dispatch<UnknownAction> }) {
    if (goals.length === 0) return null;

    return (
        <div className="flex-shrink-0 p-2">
            <h3 className="text-2xl font-semibold mb-2 text-secondary">{title}</h3>
            <ul className="space-y-2">
                {goals.map(goal => (
                    <GoalBox key={goal.id}
                    id={goal.id}
                    title={goal.name}
                    iconId={goal.iconId}
                    description={goal.description || ""}
                    targetValue={goal.targetValue}
                    unit={goal.unit}
                    currentValue={goal.currentValue}
                    complete={goal.complete}
                    categories={goal.categories}
                    motivation={goal.motivation?.toString() || ""}
                    startDate={goal.startDate}
                    endDate={goal.endDate}
                    xpReward={goal.xpReward}
                    status={goal.status}
                    term={goal.term}
                    setGoals={() => {}}
                    dispatchAction={dispatch}
                    readonly={true}
                    />
                ))}
            </ul>
        </div>
    );
}