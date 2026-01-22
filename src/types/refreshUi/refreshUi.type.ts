export type RefreshUI = {
    refreshUser?: refreshUser,
    refreshCategories?: refreshObject[],
    refreshHabit?: refreshObject,
    refreshItemChecked?: refreshItemChecked
}

type refreshUser = {
    currentConstance: number,
    alreadyIncreaseConstanceToday: boolean,
    maxConstance: number,
    xp: number,
    level:number,
    actualLevelXp: number,
    nextLevelXp: number
}

type refreshObject = {
    id: string,
    xp: number,
    level:number,
    actualLevelXp: number,
    nextLevelXp: number
}

type refreshItemChecked = {
    groupItemId: string,
    checked: boolean,
    date: string
}