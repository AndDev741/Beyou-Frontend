import { RoutineSection } from "./routineSection";

export type Routine = {
    id?: string;
    name: string;
    iconId: string;
    routineSections: Array<RoutineSection>;
}