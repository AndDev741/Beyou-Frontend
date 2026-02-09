import HabitForm from "./HabitForm";
import type { habit } from "../../types/habit/habitType";

function CreateHabit({ setHabits }: { setHabits: React.Dispatch<React.SetStateAction<habit[]>> }) {
    return <HabitForm mode="create" setHabits={setHabits} />;
}

export default CreateHabit;
