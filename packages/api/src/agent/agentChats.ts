import { TFunction } from 'i18next';
import { agentChat, agentMessage } from '@beyou/types/agent/chatType';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type Result<T> = Promise<{ success?: T; error?: ApiErrorPayload }>;

// Agent replies can chain several tool calls — same generous ceiling as
// the AI routine endpoints.
const AI_TIMEOUT_MS = 180000;

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

export async function deleteAgentChat(chatId: string, t: TFunction): Result<unknown> {
    try {
        const response = await getHttpClient().delete(`/ai/agent/chats/${chatId}`);
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

export async function sendAgentMessage(
    chatId: string,
    userInput: string,
    t: TFunction,
    /** App route the user is on (e.g. "/habits") — page context for the agent. */
    currentPage?: string,
): Result<string> {
    try {
        const response = await getHttpClient().post<{ reply: string }>(
            `/ai/agent/chats/${chatId}`, { userInput, currentPage }, { timeout: AI_TIMEOUT_MS });
        return { success: response.data.reply };
    } catch (e) {
        return toError(e, t);
    }
}
