import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";
import { sortGoalsByTime } from "./sortGoalsByTime";
import { useDragScroll } from "../../../hooks/useDragScroll";
import { goal } from "../../../types/goals/goalType";
import GoalBox from "../../goals/goalBox";


export default function GoalsTab() {
    const { t } = useTranslation();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const sortedGoals = sortGoalsByTime(goals || []);
    const scrollContainer = useDragScroll();

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
                    <GoalSection title={t("This Week")} goals={sortedGoals.thisWeek}/>
                    <GoalSection title={t("This Month")} goals={sortedGoals.thisMonth}/>
                    <GoalSection title={t("This Year")} goals={sortedGoals.thisYear}/>
                    <GoalSection title={t("Future Goals")} goals={sortedGoals.beyond}/>
                    <GoalSection title={t("Past Goals")} goals={sortedGoals.past}/>
                </div>
            </div>
        </div>


    );
}

function GoalSection({ title, goals }: { title: string, goals: goal[] }) {
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
                    readonly={true}
                    />
                ))}
            </ul>
        </div>
    );
}
