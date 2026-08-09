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
