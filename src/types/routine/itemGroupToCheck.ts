export type itemGroupToCheck = {
    routineId: string,
    localDate?: string,
    taskGroupDTO?: {
        taskGroupId: string,
        startTime: string
    },
    habitGroupDTO?: {
        habitGroupId: string,
        startTime: string
    }
}
