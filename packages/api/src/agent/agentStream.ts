import { agentSegment } from '@beyou/types/agent/chatType';
import { getLogger } from '../logger';
import { ANALYTICS_EVENTS } from '../analyticsEvents';
import { getAnalytics } from '../analytics';

/** Mirrors the backend AgentEvent "tool" payload (AgentEvent.java). */
export interface AgentToolEvent {
    tool: string;
    status: 'started' | 'finished';
    /** Present only on failure — absence means success (never "false"!). */
    error?: string;
    /** Frontend domains touched by the tool — what to refetch. */
    domains?: string[];
}

/**
 * Where the user is when they send. Both fields are hints the agent may use to resolve "this"
 * and "here", and both are optional: a message must never fail to send because the client could
 * not work one of them out.
 */
export interface AgentTurnContext {
    /** App route the user is on (e.g. "/habits"). */
    currentPage?: string;
    /** The routine entry open in Focus Mode, when they are in it. */
    selectedItemGroupId?: string;
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

    // Validate shape at this external boundary — a malformed event must not flow
    // into React state and crash a render. A bad token/tool is logged and
    // skipped; a bad done is terminal, so it surfaces as an error.
    switch (eventName) {
        case 'token':
            if (typeof data.text === 'string') handlers.onToken(data.text);
            else getLogger().error('agentStream: malformed token event');
            break;
        case 'tool':
            if (typeof data.tool === 'string') {
                handlers.onTool({
                    tool: data.tool,
                    status: data.status === 'started' ? 'started' : 'finished',
                    error: typeof data.error === 'string' ? data.error : undefined,
                    domains: Array.isArray(data.domains) ? (data.domains as string[]) : undefined,
                });
            } else {
                getLogger().error('agentStream: malformed tool event');
            }
            break;
        case 'done':
            if (Array.isArray(data.segments)) handlers.onDone(data.segments as agentSegment[]);
            else {
                getLogger().error('agentStream: malformed done event');
                handlers.onError('MALFORMED_STREAM');
            }
            break;
        case 'error':
            handlers.onError(typeof data.error === 'string' ? data.error : 'UNKNOWN');
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
    context?: AgentTurnContext,
    signal?: AbortSignal,
): Promise<void> {
    const currentPage = context?.currentPage;
    const selectedItemGroupId = context?.selectedItemGroupId;
    if (!config) {
        throw new Error('Agent stream not configured — call setAgentStreamConfig() at app startup');
    }
    const cfg = config;
    const doFetch = cfg.fetchImpl ?? fetch;
    const parse = createSseParser(handlers);

    // Tracked on send rather than on a successful reply: the question this answers is
    // whether the account adopted the agent at all, and a turn that failed upstream was
    // still an attempt to use it. `userInput` never travels — it is the user's own words,
    // and its length is reported instead so a one-word probe is distinguishable from real
    // use without carrying any of it.
    getAnalytics().track(ANALYTICS_EVENTS.AGENT_MESSAGE_SENT, {
        input_length: userInput.length,
        has_page_context: Boolean(currentPage),
        has_focus_item: Boolean(selectedItemGroupId),
    });

    // getHeaders() is re-read on each call, so a retry after refreshAuth()
    // picks up the renewed token automatically.
    const openStream = () =>
        doFetch(`${cfg.baseUrl}/ai/agent/chats/${chatId}/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...cfg.getHeaders() },
            body: JSON.stringify({ userInput, currentPage, selectedItemGroupId }),
            signal,
        });

    try {
        let response = await openStream();
        if (response.status === 401 && cfg.refreshAuth) {
            const refreshed = await cfg.refreshAuth();
            if (refreshed) response = await openStream();
        }
        if (!response.ok || !response.body) {
            handlers.onError(await failureKey(response));
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
        // Cancellation is detected by the signal and the error's name, NOT by
        // `instanceof DOMException`: React Native ships DOMException as an internal
        // module and never puts it on the global, so that test threw a TypeError
        // inside this very catch block. Every mid-stream failure on mobile — and
        // every deliberate abort, which is what switching chats or logging out
        // does — escaped as an unhandled rejection instead of reaching onError.
        if (signal?.aborted || (e as { name?: string })?.name === 'AbortError') return;
        getLogger().error(e);
        handlers.onError('NETWORK');
    }
}

/**
 * The i18n key for a stream that never opened.
 *
 * The backend already names its own failures — a throttled request answers
 * `{"errorKey":"RATE_LIMIT_EXCEEDED"}` with a Retry-After header — so prefer that
 * key over anything invented here. This used to report `HTTP_<status>` regardless,
 * a key no translation file has ever contained, so hitting the agent's hourly cap
 * told the user "An unexpected error occurred" while the correct sentence sat
 * translated and unused in both languages. The stream rides raw fetch (axios
 * buffers streams), so it never passes the interceptor that handles this for
 * every other request, which is why the fix belongs here.
 */
async function failureKey(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { errorKey?: unknown };
        if (typeof body?.errorKey === 'string' && body.errorKey) return body.errorKey;
    } catch {
        // Not JSON: a proxy or gateway answered, not our backend. Fall through to
        // the status — never surface a raw HTML error page as a message.
    }
    return `HTTP_${response.status}`;
}
