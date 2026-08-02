import HabitForm from "./HabitForm";
import type { habit } from "@beyou/types/habit/habitType";

type EditHabitProps = {
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>;
    /** Fecha o modal que hospeda o formulário. */
    onClose?: () => void;
};

function EditHabit({ setHabits, onClose }: EditHabitProps) {
    return <HabitForm mode="edit" setHabits={setHabits} onClose={onClose} />;
}

export default EditHabit;
