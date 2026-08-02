/**
 * O chat do assistente tem dois gatilhos possíveis — o botão central da barra
 * inferior e o balão flutuante do próprio widget — mas o estado de aberto vive
 * no `AgentWidget` (junto da conversa, que não pode se perder). A barra pede a
 * abertura por evento em vez de subir esse estado até o layout.
 *
 * Espelha `apps/web/src/components/agent/agentPanelBus.ts`. Não existe `window`
 * no React Native, então o barramento é um Set de handlers no escopo do módulo
 * — mesma API (`openAgentPanel` / `onAgentPanelOpen` devolvendo o unsubscribe).
 */
type OpenHandler = () => void;

const handlers = new Set<OpenHandler>();

/** Pede a abertura do chat. No-op enquanto ninguém estiver inscrito. */
export const openAgentPanel = (): void => {
  // Cópia: um handler pode se desinscrever durante a iteração.
  [...handlers].forEach((handler) => handler());
};

export const onAgentPanelOpen = (handler: OpenHandler): (() => void) => {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
};
