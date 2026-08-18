import { TFunction } from 'i18next';
import { agentChat, agentMessage } from '@beyou/types/agent/chatType';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type Result<T> = Promise<{ success?: T; error?: ApiErrorPayload }>;

function toError(e: unknown, t: TFunction): { error: ApiErrorPayload } {
    getLogger().error(e);
    return { error: parseApiError(e) ?? { message: t('UnexpectedError') } };
}

export async function getAgentChats(t: TFunction): Result<agentChat[]> {
    try {
        const response = await getHttpClient().get<agentChat[]>('/ai/agent/chats');
        return { success: response.data };
    } catch (e) {
        return toError(e, t);
    }
}

export async function createAgentChat(t: TFunction, title?: string): Result<agentChat> {
    try {
        const response = await getHttpClient().post<agentChat>('/ai/agent/chats', title ? { title } : {});
        return { success: response.data };
    } catch (e) {
        return toError(e, t);
    }
}

export async function renameAgentChat(chatId: string, title: string, t: TFunction): Result<agentChat> {
    try {
        const response = await getHttpClient().put<agentChat>(`/ai/agent/chats/${chatId}`, { title });
        return { success: response.data };
    } catch (e) {
        return toError(e, t);
    }
}

export async function deleteAgentChat(chatId: string, t: TFunction): Result<unknown> {
    try {
        const response = await getHttpClient().delete(`/ai/agent/chats/${chatId}`);
        return { success: response.data };
    } catch (e) {
        return toError(e, t);
    }
}

/** Reset the agent: delete all chats + clear its remembered context. */
export async function deleteAllAgentChats(t: TFunction): Result<unknown> {
    try {
        const response = await getHttpClient().delete('/ai/agent/chats');
        return { success: response.data };
    } catch (e) {
        return toError(e, t);
    }
}

export async function getAgentMessages(chatId: string, t: TFunction): Result<agentMessage[]> {
    try {
        const response = await getHttpClient().get<agentMessage[]>(`/ai/agent/chats/${chatId}/messages`);
        return { success: response.data };
    } catch (e) {
        return toError(e, t);
    }
}

