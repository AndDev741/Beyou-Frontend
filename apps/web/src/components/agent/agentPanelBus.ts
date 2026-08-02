/**
 * O painel do assistente tem DOIS gatilhos: o balão flutuante (desktop) e o
 * botão central da barra inferior (mobile). O estado de aberto vive no
 * AgentWidget, então a barra pede a abertura por evento em vez de subir o
 * estado até o shell.
 */
const OPEN_EVENT = "beyou:agent-open";

export const openAgentPanel = () => window.dispatchEvent(new Event(OPEN_EVENT));

export const onAgentPanelOpen = (handler: () => void) => {
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
};
