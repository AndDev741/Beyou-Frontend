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

/**
 * A page can hand the assistant a message to start from: Second Brain does it after an
 * answer, so the assistant can act on what the person just said. The text lands in the input
 * and waits there. Nothing is sent until the person sends it.
 *
 * The draft is parked in the module because the panel is a lazy chunk: on the first open it
 * does not exist yet to hear an event, so it collects the draft when it mounts.
 */
const DRAFT_EVENT = "beyou:agent-draft";
let pendingDraft: string | null = null;

export const openAgentPanelWithDraft = (text: string) => {
    pendingDraft = text;
    window.dispatchEvent(new Event(DRAFT_EVENT));
    openAgentPanel();
};

/** Hands the parked draft over once. A second call gets nothing. */
export const takeAgentDraft = (): string | null => {
    const draft = pendingDraft;
    pendingDraft = null;
    return draft;
};

export const onAgentDraft = (handler: () => void) => {
    window.addEventListener(DRAFT_EVENT, handler);
    return () => window.removeEventListener(DRAFT_EVENT, handler);
};
