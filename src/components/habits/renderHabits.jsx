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
        <div className="flex items-center p-3">
            {habits.map(habit => (
                <HabitBox
                key={habit.id}
                name={habit.name}
                iconId={habit.iconId}
                 />
            ))}
        </div>
    )
}

export default RenderHabits;