import { useEffect } from 'react';
import CreateDailyRoutine from './dailyRoutine/CreateDailyRoutine';
import CreateListRoutine from './listRoutine/CreateListRoutine';

type createRoutineProps = {
    setRoutineType: (value: string) => void;
    routineType: string;
    onDailySectionChange?: (hasSection: boolean) => void;
    onSectionModalChange?: (isOpen: boolean) => void;
    onCancel?: () => void;
    onCreated?: () => void;
};

/**
 * The creation dialog, showing whichever form the type field is set to.
 *
 * The type used to be a fork screen with two illustrations, one of which led nowhere because
 * the list routine did not exist yet. It is a field inside the form now, and switching it
 * swaps the body in place rather than restarting the flow.
 */
const CreateRoutine = ({
    setRoutineType,
    routineType,
    onDailySectionChange,
    onSectionModalChange,
    onCancel,
    onCreated
}: createRoutineProps) => {
    // O tutorial de rotinas escolhe seus passos a partir do tipo selecionado.
    useEffect(() => {
        if (!routineType) setRoutineType("daily");
    }, [routineType, setRoutineType]);

    if (routineType === "list") {
        return (
            <CreateListRoutine
                routineType={routineType}
                setRoutineType={setRoutineType}
                onCancel={onCancel}
                onCreated={onCreated}
            />
        );
    }

    return (
        <CreateDailyRoutine
            routineType={routineType || "daily"}
            setRoutineType={setRoutineType}
            onSectionChange={onDailySectionChange}
            onSectionModalChange={onSectionModalChange}
            onCancel={onCancel}
            onCreated={onCreated}
        />
    );
};

export default CreateRoutine;
