export type RoutineItem = {
    type: 'task' | 'habit';
    id: string;
    startTime: string;
    endTime?: string;
    // More shared fields can join as they are needed
};
