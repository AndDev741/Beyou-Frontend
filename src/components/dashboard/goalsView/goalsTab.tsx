import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/rootReducer";
import { sortGoalsByTime } from "./sortGoalsByTime";
import { useDragScroll } from "../../../hooks/useDragScroll";
import { goal } from "../../../types/goals/goalType";
import GoalBox from "../../goals/goalBox";
import { FiArrowRight } from "react-icons/fi";


export default function GoalsTab() {
    const { t } = useTranslation();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const sortedGoals = sortGoalsByTime(goals || []);
    const scrollContainer = useDragScroll();
    const [visibleTags, setVisibleTags] = useState<string[]>(["all"]);
    const [canScroll, setCanScroll] = useState(false);

    const sections = useMemo(() => ([
        { key: "thisWeek", title: t("This Week"), goals: sortedGoals.thisWeek },
        { key: "thisMonth", title: t("This Month"), goals: sortedGoals.thisMonth },
        { key: "thisYear", title: t("This Year"), goals: sortedGoals.thisYear },
        { key: "beyond", title: t("Future Goals"), goals: sortedGoals.beyond },
        { key: "past", title: t("Past Goals"), goals: sortedGoals.past }
    ]), [sortedGoals, t]);

    useEffect(() => {
        const element = scrollContainer.ref.current;
        if (!element) return;
        const update = () => {
            setCanScroll(element.scrollWidth > element.clientWidth + 8);
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [scrollContainer.ref, sections]);

    const isAll = visibleTags.includes("all");
    const toggleTag = (key: string) => {
        setVisibleTags(prev => {
            if (key === "all") return ["all"];
            const withoutAll = prev.filter(tag => tag !== "all");
            const exists = withoutAll.includes(key);
            const next = exists ? withoutAll.filter(tag => tag !== key) : [...withoutAll, key];
            return next.length > 0 ? next : ["all"];
        });
    };

    const filteredSections = sections.filter(section =>
        section.goals.length > 0 && (isAll || visibleTags.includes(section.key))
    );

    return (
        <div className="lg:p-4 space-y-4">
            <h2 className="text-center text-3xl font-semibold lg:text-start text-secondary">{t('Goals')}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {[{ key: "all", label: t("All") }, ...sections.map(section => ({ key: section.key, label: section.title }))].map(tag => {
                    const isActive = visibleTags.includes(tag.key);
                    return (
                        <button
                            key={tag.key}
                            type="button"
                            onClick={() => toggleTag(tag.key)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 ${isActive ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-secondary hover:border-primary/50 hover:text-primary"}`}
                        >
                            {tag.label}
                        </button>
                    );
                })}
            </div>

            <div className="relative">
                {canScroll && (
                    <>
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background via-background/70 to-transparent" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background via-background/70 to-transparent" />
                        <div className="md:hidden absolute -top-3 right-2 flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-description shadow-sm backdrop-blur">
                            <FiArrowRight className="text-sm" />
                            {t("Swipe to scroll")}
                        </div>
                    </>
                )}
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
                        {filteredSections.map(section => (
                            <GoalSection key={section.key} title={section.title} goals={section.goals} />
                        ))}
                    </div>
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
