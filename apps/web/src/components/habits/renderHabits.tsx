import getHabits from "@beyou/api/habits/getHabits";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useEffect, useCallback } from "react";
import HabitBox from "./habitBox";
import { habit } from "@beyou/types/habit/habitType";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { editModeEnter } from "@beyou/state/habit/editHabitSlice";
import EmptyState from "../EmptyState";
import { Repeat, Search } from "lucide-react";

type renderHabitsProps = {
    habits: habit[],
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>,
    /** Overrides the empty state when search/filter emptied the list, not a lack of habits. */
    emptyTitle?: string,
    /** Clears search and filters from the empty state. */
    onClearFilters?: () => void
}

function RenderHabits({habits, setHabits, emptyTitle, onClearFilters}: renderHabitsProps){
    const dispatch = useDispatch();
    const { t: tRhf } = useTranslation();

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);
    
    const loadHabits = useCallback(async () => {
        const response = await getHabits(t);
        if(Array.isArray(response.success)){
            setHabits(response.success);
        }
    }, [setHabits]);

    useEffect(() => {
        void loadHabits();
    }, [loadHabits])

    // The fetch lives in this presentational child and the list lives in the parent's
    // local state, so nothing else can refresh it. Same reason as the tasks page.
    useAutoRefresh(loadHabits);

    const hasHabits = habits.length > 0;

    return(
        // A scannable grid: 3 columns on desktop, 1 on mobile. The empty state takes
        // the full width instead of becoming one squeezed column.
        <div
            className={`text-text ${hasHabits ? "grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3" : ""}`}
            data-tutorial-id="habits-grid"
        >
            {hasHabits ? (
                habits.map((habit, index) => (
                    <div key={habit.id} data-tutorial-id={index === 0 ? "habit-card" : undefined}>
                        <HabitBox
                        id={habit.id}
                        name={habit.name}
                        iconId={habit.iconId}
                        description={habit.description}
                        level={habit.level}
                        xp={habit.xp}
                        nextLevelXp={habit.nextLevelXp}
                        actualLevelXp={habit.actualLevelXp}
                        currentStreak={habit.currentStreak}
                        bestStreak={habit.bestStreak}
                        totalCheckIns={habit.totalCheckIns}
                        firstCheckInDate={habit.firstCheckInDate}
                        streakDormant={habit.streakDormant}
                        categories={habit.categories}
                        motivationalPhrase={habit.motivationalPhrase}
                        importance={habit.importance}
                        dificulty={habit.dificulty}
                        routines={habit.routines}
                        createdAt={habit.createdAt}
                        updatedAt={habit.updatedAt}
                        setHabits={setHabits}
                        />
                    </div>
                ))
            ) : emptyTitle ? (
                <EmptyState
                    icon={<Search size={20} aria-hidden="true" />}
                    title={emptyTitle}
                    description={tRhf('NoResultsDescription')}
                    actionLabel={onClearFilters ? tRhf('ClearFilters') : undefined}
                    onAction={onClearFilters}
                    variant="ghost"
                />
            ) : (
                <EmptyState
                    icon={<Repeat size={20} aria-hidden="true" />}
                    title={tRhf('0HabitsTitle')}
                    description={tRhf('0HabitsDescription')}
                />
            )}
        </div>
    )
}

export default RenderHabits;
