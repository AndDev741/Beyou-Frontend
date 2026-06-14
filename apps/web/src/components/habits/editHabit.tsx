import HabitForm from "./HabitForm";
import type { habit } from "@beyou/types/habit/habitType";

function EditHabit({ setHabits }: { setHabits: React.Dispatch<React.SetStateAction<habit[]>> }) {
    return <HabitForm mode="edit" setHabits={setHabits} />;
}

export default EditHabit;
