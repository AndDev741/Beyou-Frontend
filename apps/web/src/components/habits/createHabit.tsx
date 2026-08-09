import HabitForm from "./HabitForm";
import type { habit } from "@beyou/types/habit/habitType";

type CreateHabitProps = {
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>;
    /** Closes the modal hosting the form. */
    onClose?: () => void;
};

function CreateHabit({ setHabits, onClose }: CreateHabitProps) {
    return <HabitForm mode="create" setHabits={setHabits} onClose={onClose} />;
}

export default CreateHabit;
