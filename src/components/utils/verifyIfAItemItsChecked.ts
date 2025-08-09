
type isItemCheckedProps = {
    taskGroup?: {
        id?: string,
        taskGroupChecks?: any[],
        taskId: string;
        startTime: string;
    };
    habitGroup?: {
        id?: string,
        habitGroupChecks?: any[],
        habitId: string;
        startTime: string;
    }
        
}
export default function isItemChecked({taskGroup, habitGroup}: isItemCheckedProps){
    let currentDate = new Date().toJSON().slice(0, 10);

    if(habitGroup && habitGroup.habitGroupChecks != undefined){
        const ItemCheck = habitGroup?.habitGroupChecks.find((check) => check?.checkDate === currentDate);
        return ItemCheck?.checked === true ? true : false;
    }

    if(taskGroup && taskGroup.taskGroupChecks != undefined){
        const ItemCheck = taskGroup?.taskGroupChecks.find((check) => check?.checkDate === currentDate);
        return ItemCheck?.checked === true ? true : false;
    }
    return false;


    
}