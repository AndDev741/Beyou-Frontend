import { useEffect } from 'react';
import CreateDailyRoutine from './dailyRoutine/CreateDailyRoutine';

type createRoutineProps = {
    setRoutineType: (value: string) => void;
    routineType: string;
    onDailySectionChange?: (hasSection: boolean) => void;
    onSectionModalChange?: (isOpen: boolean) => void;
    onCancel?: () => void;
    onCreated?: () => void;
};

/**
 * The form opens straight on the daily routine.
 *
 * There used to be a fork with two illustrations ("do you want a daily or a list
 * routine?") where the second option does not even exist — one more step to reach
 * the only possible choice. The type is now a field in the form itself, with "list"
 * visible and disabled.
 */
const CreateRoutine = ({
    setRoutineType,
    onDailySectionChange,
    onSectionModalChange,
    onCancel,
    onCreated
}: createRoutineProps) => {
    // O tutorial de rotinas escolhe seus passos a partir do tipo selecionado.
    useEffect(() => {
        setRoutineType("daily");
    }, [setRoutineType]);

    return (
        <CreateDailyRoutine
            onSectionChange={onDailySectionChange}
            onSectionModalChange={onSectionModalChange}
            onCancel={onCancel}
            onCreated={onCreated}
        />
    );
};

export default CreateRoutine;
