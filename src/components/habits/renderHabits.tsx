import getHabits from "../../services/habits/getHabits";
import { useEffect, useState } from "react";
import HabitBox from "./habitBox";
import { habit } from "../../types/habit/habitType";
import { t } from "i18next";

type renderHabitsProps = {
    habits: habit[],
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>
}

function RenderHabits({habits, setHabits}: renderHabitsProps){

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
        <div className="flex flex-wrap items-start justify-between md:justify-evenly lg:justify-start p-2 text-secondary">
            {habits.map(habit => (
                <div key={habit.id}>
                    <HabitBox
                    id={habit.id}
                    name={habit.name}
                    iconId={habit.iconId}
                    description={habit.description}
                    level={habit.level}
                    xp={habit.xp}
                    nextLevelXp={habit.nextLevelXp}
                    actualBaseXp={habit.actualBaseXp}
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
