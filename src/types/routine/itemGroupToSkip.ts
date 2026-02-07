export type itemGroupToSkip = {
    routineId: string,
    localDate?: string,
    skip: boolean,
    taskGroupDTO?: {
        taskGroupId: string,
        startTime: string
    },
    habitGroupDTO?: {
        habitGroupId: string,
        startTime: string
    }
}
