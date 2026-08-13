import { TFunction } from 'i18next';
import { habit } from '@beyou/types/habit/habitType';
import { getHttpClient, ApiError } from '../httpClient';
import { getLogger } from '../logger';

type apiResponse = Record<string, habit[] | string>

/**
 * Fills in the check scalars when the response does not carry them.
 *
 * This is the one door habits come through — every screen on web and mobile reads
 * `GET /habit` — so it is the only place that has to know the fields might be
 * missing. Without it a card renders the string "undefined dias", which is exactly
 * what a backend that predates the streak fields produces: the whole point of a
 * boundary is that a component never has to ask whether the wire kept its promise.
 *
 * Zero is the honest default here, not a guess: it is the same state as a habit
 * that has never been checked, and the card already draws that state without a
 * flame and without a record.
 */
function withCheckDefaults(raw: habit): habit {
    return {
        ...raw,
        currentStreak: raw.currentStreak ?? 0,
        bestStreak: raw.bestStreak ?? 0,
        totalCheckIns: raw.totalCheckIns ?? 0,
        firstCheckInDate: raw.firstCheckInDate ?? null,
        streakDormant: raw.streakDormant ?? false,
    };
}

async function getHabits(t: TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().get<habit[]>(`/habit`);
        const habits = Array.isArray(response.data) ? response.data.map(withCheckDefaults) : response.data;
        return {success: habits};
    }catch(e){
        if(e instanceof ApiError){
            getLogger().error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getHabits;
