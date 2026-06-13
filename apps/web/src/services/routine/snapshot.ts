import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { Snapshot, SnapshotMonthResponse } from '../../types/routine/snapshot';
import { RefreshUI } from '../../types/refreshUi/refreshUi.type';
import { ApiErrorPayload, parseApiError } from '../apiError';

type snapshotResponse = { success?: Snapshot; error?: string }
type snapshotDatesResponse = { success?: SnapshotMonthResponse; error?: string }
type snapshotActionResponse = { success?: RefreshUI; error?: ApiErrorPayload }

export async function getSnapshot(routineId: string, date: string, t: TFunction): Promise<snapshotResponse> {
    try {
        const response = await axiosWithCredentials.get<Snapshot>(`/routine/${routineId}/snapshot`, {
            params: { date }
        });
        return { success: response.data };
    } catch (e) {
        if (axios.isAxiosError(e)) {
            console.error(e);
        }
        return { error: t('UnexpectedError') };
    }
}

export async function getSnapshotDatesForMonth(routineId: string, month: string, t: TFunction): Promise<snapshotDatesResponse> {
    try {
        const response = await axiosWithCredentials.get<SnapshotMonthResponse>(`/routine/${routineId}/snapshots`, {
            params: { month }
        });
        return { success: response.data };
    } catch (e) {
        if (axios.isAxiosError(e)) {
            console.error(e);
        }
        return { error: t('UnexpectedError') };
    }
}

export async function checkSnapshotItem(snapshotId: string, snapshotCheckId: string, t: TFunction): Promise<snapshotActionResponse> {
    try {
        const response = await axiosWithCredentials.post<RefreshUI>(`/routine/snapshot/check`, {
            snapshotId,
            snapshotCheckId
        });
        return { success: response.data };
    } catch (e) {
        if (axios.isAxiosError(e)) {
            console.error(e);
            return { error: parseApiError(e) };
        }
        return { error: { message: t('UnexpectedError') } };
    }
}

export async function skipSnapshotItem(snapshotId: string, snapshotCheckId: string, t: TFunction): Promise<snapshotActionResponse> {
    try {
        const response = await axiosWithCredentials.post<RefreshUI>(`/routine/snapshot/skip`, {
            snapshotId,
            snapshotCheckId
        });
        return { success: response.data };
    } catch (e) {
        if (axios.isAxiosError(e)) {
            console.error(e);
            return { error: parseApiError(e) };
        }
        return { error: { message: t('UnexpectedError') } };
    }
}
