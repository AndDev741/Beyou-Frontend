import { useSelector } from "react-redux"
import getHabits from "../../services/habits/getHabits";
import { useEffect, useState } from "react";
import HabitBox from "./habitBox";
import { RootState } from "../../redux/rootReducer";
import { habit } from "../../types/habit/habitType";
import { t } from "i18next";

function RenderHabits(){
    const userId = useSelector((state: RootState) => state.perfil.id);
    const [habits, setHabits] = useState<habit[]>([]);

    useEffect(() => {
        const returnHabits = async () => {
            const response = await getHabits(userId, t);
            if(Array.isArray(response.success)){
                setHabits(response.success);
            }
        }
        returnHabits();
    }, [userId])

    return(
        <div className="flex flex-wrap items-start justify-between md:justify-evenly lg:justify-start  p-2">
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
                    />
                </div>
            ))}
        </div>
    )
}

export default RenderHabits;