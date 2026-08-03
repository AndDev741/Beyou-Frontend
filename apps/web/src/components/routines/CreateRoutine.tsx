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
 * O formulário abre direto na rotina diária.
 *
 * Antes havia uma bifurcação com duas ilustrações ("quer uma rotina diária ou
 * de lista?") em que a segunda opção nem existe — um passo a mais para chegar
 * na única escolha possível. O tipo agora é um campo do próprio formulário,
 * com "em lista" desabilitado e visível.
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
