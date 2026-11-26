import { afterEach, describe, expect, it } from 'vitest';
import { assertAiRequestAllowed, sendsToAiProvider, setAiConsentReader } from './aiConsentGate';

describe('aiConsentGate', () => {
    afterEach(() => setAiConsentReader(() => true));

    it('knows the routes that reach the AI provider', () => {
        expect(sendsToAiProvider('POST', '/ai/agent/chats/1/stream')).toBe(true);
        expect(sendsToAiProvider('post', '/notebook/ai/pages/1/chat?x=1')).toBe(true);
        expect(sendsToAiProvider('POST', '/notebook/pages/1/sources/pdf')).toBe(true);
        expect(sendsToAiProvider('POST', '/second-brain/questions/2/answer')).toBe(true);
        expect(sendsToAiProvider('GET', '/ai/agent/chats')).toBe(false);
        expect(sendsToAiProvider('POST', '/ai/agent/chats')).toBe(false);
        expect(sendsToAiProvider('POST', '/habit')).toBe(false);
    });

    it("refuses an AI route without a yes, with the server's own error", () => {
        setAiConsentReader(() => false);
        expect(() => assertAiRequestAllowed('POST', '/onboarding/suggestions')).toThrow(
            expect.objectContaining({ status: 400, data: expect.objectContaining({ errorKey: 'AI_CONSENT_DECLINED' }) }),
        );
        expect(() => assertAiRequestAllowed('POST', '/habit')).not.toThrow();
    });

    it('lets it through after a yes', () => {
        setAiConsentReader(() => true);
        expect(() => assertAiRequestAllowed('POST', '/onboarding/suggestions')).not.toThrow();
    });
});
