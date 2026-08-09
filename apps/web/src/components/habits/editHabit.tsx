import HabitForm from "./HabitForm";
import type { habit } from "@beyou/types/habit/habitType";

type EditHabitProps = {
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>;
    /** Closes the modal hosting the form. */
    onClose?: () => void;
};

function EditHabit({ setHabits, onClose }: EditHabitProps) {
    return <HabitForm mode="edit" setHabits={setHabits} onClose={onClose} />;
}

export default EditHabit;
