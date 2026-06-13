import { Routine } from "../routine/routine"

export type schedule = {
    id?: string,
    days: string[],
    routine: Routine
}