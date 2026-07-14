import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
    AgentStreamHandlers,
    createSseParser,
    resetAgentStreamConfig,
    setAgentStreamConfig,
    streamAgentMessage,
} from './agentStream';
import { setLogger } from '../logger';

function makeHandlers(): AgentStreamHandlers {
    return {
        onToken: vi.fn(),
        onTool: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
    };
}

beforeEach(() => {
    setLogger({ error: vi.fn() });
});

describe('createSseParser', () => {
    test('parses a complete token event', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse('event: token\ndata: {"text":"Olá"}\n\n');

        expect(handlers.onToken).toHaveBeenCalledWith('Olá');
    });

    test('an event split across two chunks is only dispatched when complete', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse('event: token\ndata: {"te');
        expect(handlers.onToken).not.toHaveBeenCalled();

        parse('xt":"hábito"}\n\n');
        expect(handlers.onToken).toHaveBeenCalledWith('hábito');
    });

    test('two events in one chunk both dispatch, in order', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse(
            'event: token\ndata: {"text":"a"}\n\n' +
            'event: token\ndata: {"text":"b"}\n\nevent: done\ndata: {"segm',
        );

        expect(handlers.onToken).toHaveBeenNthCalledWith(1, 'a');
        expect(handlers.onToken).toHaveBeenNthCalledWith(2, 'b');
        expect(handlers.onDone).not.toHaveBeenCalled(); // still buffered

        parse('ents":[{"type":"text","text":"ab"}]}\n\n');
        expect(handlers.onDone).toHaveBeenCalledWith([{ type: 'text', text: 'ab' }]);
    });

    test('heartbeat comments are ignored', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse(': ping\n\nevent: token\ndata: {"text":"x"}\n\n');

        expect(handlers.onToken).toHaveBeenCalledTimes(1);
        expect(handlers.onToken).toHaveBeenCalledWith('x');
    });

    test('tool events carry status, error absence and domains', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse('event: tool\ndata: {"tool":"createUserHabit","status":"started"}\n\n');
        parse('event: tool\ndata: {"tool":"createUserHabit","status":"finished","domains":["habits"]}\n\n');

        expect(handlers.onTool).toHaveBeenNthCalledWith(1, { tool: 'createUserHabit', status: 'started' });
        expect(handlers.onTool).toHaveBeenNthCalledWith(2, {
            tool: 'createUserHabit',
            status: 'finished',
            domains: ['habits'],
        });
    });

    test('error events dispatch the key', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse('event: error\ndata: {"error":"NonTransientAiException"}\n\n');

        expect(handlers.onError).toHaveBeenCalledWith('NonTransientAiException');
    });
});

/** Minimal ReadableStream that emits one text chunk then closes. */
function bodyOf(text: string): ReadableStream<Uint8Array> {
    const bytes = new TextEncoder().encode(text);
    return new ReadableStream({
        start(controller) {
            controller.enqueue(bytes);
            controller.close();
        },
    });
}

describe('streamAgentMessage 401 retry', () => {
    afterEach(() => {
        resetAgentStreamConfig();
        vi.unstubAllGlobals();
    });

    test('refreshes and retries once on 401, then streams', async () => {
        const refreshAuth = vi.fn().mockResolvedValue(true);
        setAgentStreamConfig({ baseUrl: 'http://x', getHeaders: () => ({}), refreshAuth });

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response(bodyOf('event: done\ndata: {"segments":[{"type":"text","text":"ok"}]}\n\n'), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const handlers = makeHandlers();
        await streamAgentMessage('c1', 'hi', handlers);

        expect(refreshAuth).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(handlers.onDone).toHaveBeenCalledWith([{ type: 'text', text: 'ok' }]);
        expect(handlers.onError).not.toHaveBeenCalled();
    });

    test('gives up with an error if refresh fails', async () => {
        const refreshAuth = vi.fn().mockResolvedValue(false);
        setAgentStreamConfig({ baseUrl: 'http://x', getHeaders: () => ({}), refreshAuth });

        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal('fetch', fetchMock);

        const handlers = makeHandlers();
        await streamAgentMessage('c1', 'hi', handlers);

        expect(refreshAuth).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1); // no retry when refresh fails
        expect(handlers.onError).toHaveBeenCalledWith('HTTP_401');
    });

    test('malformed JSON is logged and skipped without killing the stream', () => {
        const handlers = makeHandlers();
        const parse = createSseParser(handlers);

        parse('event: token\ndata: {broken\n\nevent: token\ndata: {"text":"ok"}\n\n');

        expect(handlers.onToken).toHaveBeenCalledTimes(1);
        expect(handlers.onToken).toHaveBeenCalledWith('ok');
    });
});
