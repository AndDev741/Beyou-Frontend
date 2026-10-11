import { TFunction } from 'i18next';
import type {
    BlockPatch, BlockRequest, CycleConfigRequest, PlanRequest, PlanResponse, SessionRequest, SessionResponse,
    StudyCycle, StudyCycleSummary, StudyHistory, StudyToday,
} from '@beyou/types/notebook/studyCycle';
import { call, http, Result } from './result';

/** Study cycles: the queue of blocks, today's slice of it, and the manual session log. */

export const getStudyCycles = (t: TFunction): Promise<Result<StudyCycleSummary[]>> =>
    call(() => http().get<StudyCycleSummary[]>('/notebook/cycles'), t);

export const getStudyToday = (t: TFunction): Promise<Result<StudyToday>> =>
    call(() => http().get<StudyToday>('/notebook/cycles/today'), t);

/** The editor's preview: the same arithmetic the server uses when it saves. */
export const planStudyCycle = (request: PlanRequest, t: TFunction): Promise<Result<PlanResponse>> =>
    call(() => http().post<PlanResponse>('/notebook/cycles/plan', request), t);

export const createStudyCycle = (request: CycleConfigRequest, t: TFunction): Promise<Result<StudyCycle>> =>
    call(() => http().post<StudyCycle>('/notebook/cycles', request), t);

export const getStudyCycle = (cycleId: string, t: TFunction): Promise<Result<StudyCycle>> =>
    call(() => http().get<StudyCycle>(`/notebook/cycles/${cycleId}`), t);

/** Config change: the server plans the blocks again and keeps each one's progress by topic. */
export const updateStudyCycle = (cycleId: string, request: CycleConfigRequest, t: TFunction): Promise<Result<StudyCycle>> =>
    call(() => http().put<StudyCycle>(`/notebook/cycles/${cycleId}`, request), t);

/** The whole ordered block list, `id` set for blocks that already exist. */
export const replaceStudyBlocks = (cycleId: string, blocks: BlockRequest[], t: TFunction): Promise<Result<StudyCycle>> =>
    call(() => http().put<StudyCycle>(`/notebook/cycles/${cycleId}/blocks`, blocks), t);

export const updateStudyBlock = (cycleId: string, blockId: string, patch: BlockPatch, t: TFunction): Promise<Result<StudyCycle>> =>
    call(() => http().patch<StudyCycle>(`/notebook/cycles/${cycleId}/blocks/${blockId}`, patch), t);

/** Ends a cycle and frees its topics for another one. */
export const archiveStudyCycle = (cycleId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().post<void>(`/notebook/cycles/${cycleId}/archive`), t);

export const deleteStudyCycle = (cycleId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/cycles/${cycleId}`), t);

/** `from` and `to` are "YYYY-MM-DD", at most 31 days apart. */
export const getStudyHistory = (cycleId: string, from: string, to: string, t: TFunction): Promise<Result<StudyHistory>> =>
    call(() => http().get<StudyHistory>(`/notebook/cycles/${cycleId}/history`, { params: { from, to } }), t);

/** Study done outside the timer: a book, a class, exercises on paper. */
export const logStudySession = (request: SessionRequest, t: TFunction): Promise<Result<SessionResponse>> =>
    call(() => http().post<SessionResponse>('/notebook/sessions', request), t);

export const deleteStudySession = (sessionId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/sessions/${sessionId}`), t);
