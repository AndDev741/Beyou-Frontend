import getHabits from "../../services/habits/getHabits";
import { useEffect } from "react";
import HabitBox from "./habitBox";
import { habit } from "../../types/habit/habitType";
import { t } from "i18next";
import { useDispatch } from "react-redux";
import { editModeEnter } from "../../redux/habit/editHabitSlice";

type renderHabitsProps = {
    habits: habit[],
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>
}

function RenderHabits({habits, setHabits}: renderHabitsProps){
    const dispatch = useDispatch();

    //When open the page
    useEffect(() => {
        dispatch(editModeEnter(false));
    }, []);
    
    useEffect(() => {
        const returnHabits = async () => {
            const response = await getHabits(t);
            if(Array.isArray(response.success)){
                setHabits(response.success);
            }
        }
        returnHabits();
    }, [])

    return(
        <div
            className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 text-secondary"
            data-tutorial-id="habits-grid"
        >
            {habits.map((habit, index) => (
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
                    constance={habit.constance}
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
            ))}
        </div>
    )
}

export default RenderHabits;
