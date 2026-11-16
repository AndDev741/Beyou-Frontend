/**
 * The assistant chat has two possible triggers — the bottom bar's centre button
 * and the widget's own floating bubble — but the open state lives in `AgentWidget`
 * (next to the conversation, which must not be lost). The bar asks for the panel
 * through an event instead of lifting that state up to the layout.
 *
 * Mirrors `apps/web/src/components/agent/agentPanelBus.ts`. There is no `window`
 * in React Native, so the bus is a Set of handlers in module scope
 * — mesma API (`openAgentPanel` / `onAgentPanelOpen` devolvendo o unsubscribe).
 */
type OpenHandler = () => void;

const handlers = new Set<OpenHandler>();

/** Asks for the chat to open. A no-op while nobody is subscribed. */
export const openAgentPanel = (): void => {
  // Copy: a handler may unsubscribe during the iteration.
  [...handlers].forEach((handler) => handler());
};

export const onAgentPanelOpen = (handler: OpenHandler): (() => void) => {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
};

/**
 * A screen can hand the assistant a message to start from: Second Brain does it after an
 * answer, so the assistant can act on what the person just said. The text lands in the input
 * and waits there. Nothing is sent until the person sends it.
 *
 * Same three calls as the web bus. The draft is parked in the module so whoever holds the
 * conversation can also collect one that was handed over before it subscribed.
 */
const draftHandlers = new Set<OpenHandler>();
let pendingDraft: string | null = null;

/** Draft first, then open: the chat must know about the draft before it loads its history. */
export const openAgentPanelWithDraft = (text: string): void => {
  pendingDraft = text;
  [...draftHandlers].forEach((handler) => handler());
  openAgentPanel();
};

/** Hands the parked draft over once. A second call gets nothing. */
export const takeAgentDraft = (): string | null => {
  const draft = pendingDraft;
  pendingDraft = null;
  return draft;
};

export const onAgentDraft = (handler: OpenHandler): (() => void) => {
  draftHandlers.add(handler);
  return () => {
    draftHandlers.delete(handler);
  };
};
