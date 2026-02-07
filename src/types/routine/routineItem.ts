export type RoutineItem = {
    type: 'task' | 'habit';
    id: string;
    startTime: string;
    endTime?: string;
    // Podemos adicionar outros campos comuns se necessário
};
