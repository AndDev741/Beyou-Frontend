import category from "../category/categoryType"

export type habit = {
    id: string,
    name: string,
    description: string,
    motivationalPhrase:string,
    iconId: string,
    categories: category[],
    routines: string[],
    importance:number,
    dificulty: number,
    xp: number,
    level: number,
    nextLevelXp: number,
    actualLevelXp: number,
    constance: number,
    createdAt: Date,
    updatedAt: Date
}