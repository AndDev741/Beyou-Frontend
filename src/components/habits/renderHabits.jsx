import { useSelector } from "react-redux"
import getHabits from "../../services/habits/getHabits";
import { useEffect, useState } from "react";
import HabitBox from "./habitBox";

function RenderHabits(){
    const userId = useSelector(state => state.perfil.id);
    const [habits, setHabits] = useState([]);

    useEffect(() => {
        const returnHabits = async () => {
            const response = await getHabits(userId);
            setHabits(response);
        }

        returnHabits();
    }, [])

    return(
        <div className="flex flex-wrap items-start justify-between md:justify-evenly lg:justify-start  p-2">
            {habits.map(habit => (
                <HabitBox
                key={habit.id}
                name={habit.name}
                iconId={habit.iconId}
                description={habit.description}
                level={habit.level}
                xp={habit.xp}
                nextLevelXp={habit.nextLevelXp}
                actualLevelXp={habit.actualBaseXp}
                constance={habit.constance}
                categories={habit.categories}
                motivationalPhrase={habit.motivationalPhrase}
                importance={habit.importance}
                dificulty={habit.dificulty}
                 />
            ))}
        </div>
    )
}

export default RenderHabits;