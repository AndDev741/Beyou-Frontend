export type RoutineItem = {
    type: 'task' | 'habit';
    id: string;
    startTime: string;
    // Podemos adicionar outros campos comuns se necessário
};