import { agentSegment } from '@beyou/types/agent/chatType';
import { getLogger } from '../logger';

/** Mirrors the backend AgentEvent "tool" payload (AgentEvent.java). */
export interface AgentToolEvent {
    tool: string;
    status: 'started' | 'finished';
    /** Present only on failure — absence means success (never "false"!). */
    error?: string;
    /** Frontend domains touched by the tool — what to refetch. */
    domains?: string[];
}

export interface AgentStreamHandlers {
    onToken: (text: string) => void;
    onTool: (event: AgentToolEvent) => void;
    /** Authoritative structured turn — replace the live-built segments with this. */
    onDone: (segments: agentSegment[]) => void;
    onError: (errorKey: string) => void;
}

/**
 * Streaming can't ride the HttpClient abstraction (axios/XHR buffers the
 * whole response), so it registers its own transport config — same
 * setter-singleton pattern as setHttpClient.
 */
interface AgentStreamConfig {
    baseUrl: string;
    /** Function, not value: the JWT rotates on silent refresh. */
    getHeaders: () => Record<string, string>;
    /**
     * Refresh the auth token and update whatever getHeaders() reads from.
     * Resolves true if the token was renewed. Raw fetch bypasses the axios
     * 401-refresh interceptor, so the stream drives its own single retry.
     */
    refreshAuth?: () => Promise<boolean>;
    /**
     * Streaming-capable fetch. Web uses the global fetch; React Native's
     * global fetch buffers the whole body, so mobile passes expo/fetch here.
     */
    fetchImpl?: typeof fetch;
}

let config: AgentStreamConfig | undefined;

export function setAgentStreamConfig(c: AgentStreamConfig) {
    config = c;
}

export function resetAgentStreamConfig() {
    config = undefined;
}

/**
 * Incremental SSE parser. Feed it decoded text chunks in arrival order;
 * it buffers partial events across chunks (1 TCP read ≠ 1 SSE event) and
 * dispatches each complete `event:`/`data:` block to the handlers.
 * Split from the fetch loop so tests can feed it strings directly.
 */
export function createSseParser(handlers: AgentStreamHandlers): (chunk: string) => void {
    let buffer = '';
    return (chunk) => {
        buffer += chunk;
        const pieces = buffer.split('\n\n');
        // The last piece may be an incomplete event — keep it for the next chunk.
        buffer = pieces.pop() ?? '';
        for (const piece of pieces) {
            dispatchEvent(piece, handlers);
        }
    };
}

function dispatchEvent(piece: string, handlers: AgentStreamHandlers) {
    let eventName = '';
    const dataLines: string[] = [];
    for (const line of piece.split('\n')) {
        if (line.startsWith(':')) continue; // comment/heartbeat
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return;

    let data: Record<string, unknown>;
    try {
        data = JSON.parse(dataLines.join('\n'));
    } catch (e) {
        getLogger().error(e);
        return;
    }

    switch (eventName) {
        case 'token':
            handlers.onToken(String(data.text ?? ''));
            break;
        case 'tool':
            handlers.onTool(data as unknown as AgentToolEvent);
            break;
        case 'done':
            handlers.onDone((data.segments as agentSegment[]) ?? []);
            break;
        case 'error':
            handlers.onError(String(data.error ?? 'UNKNOWN'));
            break;
    }
}

/**
 * Opens the SSE stream for one agent message and pumps events into the
 * handlers. Resolves when the stream closes (after done/error) — callers
 * can simply await it. Aborting the signal cancels the whole pipeline,
 * all the way back to the LLM provider.
 *
 * Raw fetch bypasses the axios 401-refresh interceptor, so on an expired
 * token this drives its own single refresh-and-retry via config.refreshAuth.
 */
export async function streamAgentMessage(
    chatId: string,
    userInput: string,
    handlers: AgentStreamHandlers,
    /** App route the user is on (e.g. "/habits") — page context for the agent. */
    currentPage?: string,
    signal?: AbortSignal,
): Promise<void> {
    if (!config) {
        throw new Error('Agent stream not configured — call setAgentStreamConfig() at app startup');
    }
    const cfg = config;
    const doFetch = cfg.fetchImpl ?? fetch;
    const parse = createSseParser(handlers);

    // getHeaders() is re-read on each call, so a retry after refreshAuth()
    // picks up the renewed token automatically.
    const openStream = () =>
        doFetch(`${cfg.baseUrl}/ai/agent/chats/${chatId}/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...cfg.getHeaders() },
            body: JSON.stringify({ userInput, currentPage }),
            signal,
        });

    try {
        let response = await openStream();
        if (response.status === 401 && cfg.refreshAuth) {
            const refreshed = await cfg.refreshAuth();
            if (refreshed) response = await openStream();
        }
        if (!response.ok || !response.body) {
            handlers.onError(`HTTP_${response.status}`);
            return;
        }

        const reader = response.body.getReader();
        // stream: true holds back trailing bytes of a multi-byte UTF-8 char
        // split across chunks — decoding per-chunk would corrupt "há|bito".
        const decoder = new TextDecoder();
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            parse(decoder.decode(value, { stream: true }));
        }
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // user cancelled — not an error
        getLogger().error(e);
        handlers.onError('NETWORK');
    }
}
