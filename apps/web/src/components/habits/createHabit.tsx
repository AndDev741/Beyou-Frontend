import HabitForm from "./HabitForm";
import type { habit } from "@beyou/types/habit/habitType";

type CreateHabitProps = {
    setHabits: React.Dispatch<React.SetStateAction<habit[]>>;
    /** Fecha o modal que hospeda o formulário. */
    onClose?: () => void;
};

function CreateHabit({ setHabits, onClose }: CreateHabitProps) {
    return <HabitForm mode="create" setHabits={setHabits} onClose={onClose} />;
}

export default CreateHabit;
