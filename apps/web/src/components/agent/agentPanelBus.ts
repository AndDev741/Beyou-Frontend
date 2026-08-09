/**
 * The assistant panel has TWO triggers: the floating bubble (desktop) and the
 * bottom bar's centre button (phones). The open state lives in AgentWidget, so the
 * bar asks for the panel through an event instead of lifting the state up to the
 * shell.
 */
const OPEN_EVENT = "beyou:agent-open";

export const openAgentPanel = () => window.dispatchEvent(new Event(OPEN_EVENT));

export const onAgentPanelOpen = (handler: () => void) => {
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
};
