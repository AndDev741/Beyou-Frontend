import { RoutineSection } from "./routineSection";

export type Routine = {
    name: string;
    iconId: string;
    routineSections: Array<RoutineSection>;
}