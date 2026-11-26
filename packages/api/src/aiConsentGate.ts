import { ApiError } from './httpClient';

/**
 * The routes whose work goes to the AI provider (the model, the embedding model or the source
 * search). The same set the server marks `@SendsToAiProvider` and refuses without a yes; keep
 * the two together.
 *
 * Paths are relative to the API base (`/notebook/ai/...`), the way the shared clients call them.
 */
export function sendsToAiProvider(method: string, path: string): boolean {
    if (method.toUpperCase() !== 'POST') return false;
    const p = path.split('?')[0];
    return (
        p.startsWith('/ai/agent/chats/') ||
        p === '/onboarding/suggestions' ||
        p.startsWith('/notebook/ai/') ||
        (p.startsWith('/notebook/pages/') && p.includes('/sources/')) ||
        p === '/second-brain/questions/refill' ||
        p === '/second-brain/insight/refresh' ||
        (p.startsWith('/second-brain/questions/') && p.endsWith('/answer'))
    );
}

let aiAllowed: () => boolean = () => true;

/**
 * Each app says, at startup, whether the signed-in person said yes to the AI provider (read
 * from its own store, so it is current on every request). Until then nothing is refused here;
 * both apps set it before the first request, and to false for anything but a stored yes.
 */
export function setAiConsentReader(reader: () => boolean): void {
    aiAllowed = reader;
}

/**
 * Refuses, in the client, a request to an AI route without a yes: nothing leaves the device.
 * Thrown as the server's own answer (400 `AI_CONSENT_DECLINED`), so every screen shows the
 * translated message it already knows. Every transport calls it right before each attempt:
 * the HTTP clients, the agent's stream, the phone's file upload.
 */
export function assertAiRequestAllowed(method: string, path: string): void {
    if (sendsToAiProvider(method, path) && !aiAllowed()) {
        throw new ApiError(400, {
            errorKey: 'AI_CONSENT_DECLINED',
            message: 'AI features are off for this account.',
        });
    }
}
