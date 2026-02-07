import { createSlice } from "@reduxjs/toolkit";
import { Routine } from "../../types/routine/routine";

const initialState: {
    routine: Routine | null;
} = {
    routine: null,
};

const routinesSlice = createSlice({
    name: 'todayRoutine',
    initialState,
    reducers: {
        enterTodayRoutine(state, action) {
            const routine = action.payload;
            return { ...state, routine };
        },
        refreshItemGroup(state, action) {
            const {groupItemId, check } = action.payload;

            const sections = state?.routine?.routineSections;
            if(!sections) return;

            for (const section of sections){
                const habitGroup = section.habitGroup?.find(g => g.id === groupItemId);
                if(habitGroup) {
                    const findCheck = habitGroup.habitGroupChecks?.find(c => c.checkDate === check.checkDate);
                    if(findCheck){
                        findCheck.id = check.id,
                        findCheck.checkDate = check.checkDate,
                        findCheck.checkTime = check.checkTime,
                        findCheck.checked = check.checked,
                        findCheck.skipped = check.skipped
                    } else {
                        habitGroup.habitGroupChecks?.push({
                            id: check.id,
                            checkDate: check.checkDate,
                            checkTime: check.checkTime,
                            checked: check.checked,
                            skipped: check.skipped,
                            xpGenerated: check.xpGenerated
                        })
                    }

                    return;
                }

                const taskGroup = section.taskGroup?.find(g => g.id === groupItemId);
                if(taskGroup) {
                    const findCheck = taskGroup.taskGroupChecks?.find(c => c.checkDate === check.checkDate);
                    if(findCheck){
                        findCheck.id = check.id,
                        findCheck.checkDate = check.checkDate,
                        findCheck.checkTime = check.checkTime,
                        findCheck.checked = check.checked,
                        findCheck.skipped = check.skipped
                    } else {
                        taskGroup.taskGroupChecks?.push({
                            id: check.id,
                            checkDate: check.checkDate,
                            checkTime: check.checkTime,
                            checked: check.checked,
                            skipped: check.skipped,
                            xpGenerated: check.xpGenerated
                        })
                    }

                    return;
                }
            }
        }
    }

});

export const { enterTodayRoutine, refreshItemGroup } = routinesSlice.actions;

export default routinesSlice.reducer;
