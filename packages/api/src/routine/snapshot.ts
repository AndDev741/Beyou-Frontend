import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { Snapshot, SnapshotMonthResponse } from '@beyou/types/routine/snapshot';
import { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type snapshotResponse = { success?: Snapshot; error?: string }
type snapshotsDayResponse = { success?: Snapshot[]; error?: string }
type snapshotDatesResponse = { success?: SnapshotMonthResponse; error?: string }
type snapshotActionResponse = { success?: RefreshUI; error?: ApiErrorPayload }

export async function getSnapshot(routineId: string, date: string, t: TFunction): Promise<snapshotResponse> {
    try {
        const response = await getHttpClient().get<Snapshot>(`/routine/${routineId}/snapshot`, {
            params: { date }
        });
        return { success: response.data };
    } catch (e) {
        if (e instanceof ApiError) {
            getLogger().error(e);
        }
        return { error: t('UnexpectedError') };
    }
}

// All of the user's snapshots for one day in a single request (replaces the
// old per-routine Promise.all fan-out). Each Snapshot carries its routineId.
export async function getSnapshotsForDay(date: string, t: TFunction): Promise<snapshotsDayResponse> {
    try {
        const response = await getHttpClient().get<Snapshot[]>(`/routine/snapshot`, {
            params: { date }
        });
        return { success: response.data };
    } catch (e) {
        if (e instanceof ApiError) {
            getLogger().error(e);
        }
        return { error: t('UnexpectedError') };
    }
}

export async function getSnapshotDatesForMonth(routineId: string, month: string, t: TFunction): Promise<snapshotDatesResponse> {
    try {
        const response = await getHttpClient().get<SnapshotMonthResponse>(`/routine/${routineId}/snapshots`, {
            params: { month }
        });
        return { success: response.data };
    } catch (e) {
        if (e instanceof ApiError) {
            getLogger().error(e);
        }
        return { error: t('UnexpectedError') };
    }
}

export async function checkSnapshotItem(snapshotId: string, snapshotCheckId: string, t: TFunction): Promise<snapshotActionResponse> {
    try {
        const response = await getHttpClient().post<RefreshUI>(`/routine/snapshot/check`, {
            snapshotId,
            snapshotCheckId
        });
        return { success: response.data };
    } catch (e) {
        if (e instanceof ApiError) {
            getLogger().error(e);
            return { error: parseApiError(e) };
        }
        return { error: { message: t('UnexpectedError') } };
    }
}

export async function skipSnapshotItem(snapshotId: string, snapshotCheckId: string, t: TFunction): Promise<snapshotActionResponse> {
    try {
        const response = await getHttpClient().post<RefreshUI>(`/routine/snapshot/skip`, {
            snapshotId,
            snapshotCheckId
        });
        return { success: response.data };
    } catch (e) {
        if (e instanceof ApiError) {
            getLogger().error(e);
            return { error: parseApiError(e) };
        }
        return { error: { message: t('UnexpectedError') } };
    }
}
