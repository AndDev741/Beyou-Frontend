export type itemGroupToCheck = {
    routineId: string,
    taskGroupDTO?: {
        taskGroupId: string,
        startTime: string
    },
    habitGroupDTO?: {
        habitGroupId: string,
        startTime: string
    }
}