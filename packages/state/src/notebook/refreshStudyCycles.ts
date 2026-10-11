import type { TFunction } from 'i18next';
import type { Dispatch } from '@reduxjs/toolkit';
import { getStudyCycle, getStudyCycles, getStudyToday } from '@beyou/api/notebook';
import { enterStudyCycle, enterStudyCycles, enterStudyToday, removeStudyCycle, type StudyCyclesState } from './studyCycleSlice';

/**
 * Re-reads what a write may have moved in the study cycles: today's slice, the list, and every
 * cycle already open in full.
 *
 * Called after the app's own writes (a session logged, a block edited, a pomodoro filed on a
 * page) and by the assistant refresher when a tool reports the `studyCycles` domain. A cycle
 * that no longer loads (archived or deleted elsewhere) leaves the slice.
 */
export async function refreshStudyCycles(
    dispatch: Dispatch,
    studyCycles: Pick<StudyCyclesState, 'byId'>,
    t: TFunction,
): Promise<void> {
    const openIds = Object.keys(studyCycles.byId);
    const [today, list, cycles] = await Promise.all([
        getStudyToday(t),
        getStudyCycles(t),
        Promise.all(openIds.map((id) => getStudyCycle(id, t))),
    ]);
    if (today.success) dispatch(enterStudyToday(today.success));
    if (list.success) dispatch(enterStudyCycles(list.success));
    cycles.forEach((cycle, i) => {
        if (cycle.success) dispatch(enterStudyCycle(cycle.success));
        else if (cycle.error?.errorKey === 'STUDY_CYCLE_NOT_FOUND') dispatch(removeStudyCycle(openIds[i]));
    });
}
