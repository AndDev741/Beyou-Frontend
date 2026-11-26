/**
 * Asks for the AI consent dialog from anywhere (Configuration, the assistant), the way
 * `agentPanelBus` asks for the assistant: the dialog lives once, in `AiConsentGate`.
 */
type Handler = () => void;

const handlers = new Set<Handler>();

export const openAiConsent = (): void => {
    [...handlers].forEach((handler) => handler());
};

export const onAiConsentOpen = (handler: Handler): (() => void) => {
    handlers.add(handler);
    return () => {
        handlers.delete(handler);
    };
};
