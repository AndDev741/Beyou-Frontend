import { schedule } from "../schedule/schedule";
import { RoutineSection } from "./routineSection";

export type Routine = {
    id?: string;
    name: string;
    type?: string;
    iconId: string;
    routineSections: Array<RoutineSection>;
    schedule?: schedule;
    xp?: number,
    level?: number,
    nextLevelXp?: number,
    actualLevelXp?: number,
}