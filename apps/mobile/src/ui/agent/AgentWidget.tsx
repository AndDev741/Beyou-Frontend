import { useContext, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Sparkles } from 'lucide-react-native';
import type { RootState } from '../../store';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import AgentChatModal from './AgentChatModal';
import { onAgentPanelOpen } from './agentPanelBus';
import { useAgentChat } from './useAgentChat';

interface AgentWidgetProps {
  /**
   * Desenha o balão flutuante. O host que já oferece um gatilho próprio — o
   * botão central da `BottomNav`, que é o caso de toda tela autenticada no
   * mobile — passa `false` e deixa a barra ser a porta de entrada; a conversa
   * continua morando aqui. Padrão `true` para quem montar o widget sozinho,
   * sem barra (é o mesmo corte do web, onde o balão só aparece a partir de
   * `lg`, largura em que a barra inferior não existe).
   */
  showFab?: boolean;
}

/**
 * Global AI assistant entry point, mounted once in the (app) layout so it
 * floats over every authenticated screen. Chat state lives here (via
 * useAgentChat), so closing the modal or navigating never loses the thread.
 */
export default function AgentWidget({ showFab = true }: AgentWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const isTutorialCompleted = useSelector(
    (state: RootState) => state.perfil.isTutorialCompleted
  );
  const [open, setOpen] = useState(false);
  const chat = useAgentChat();

  const openPanel = () => {
    chat.ensureLoaded();
    setOpen(true);
  };

  // O botão central da barra inferior é o gatilho do mobile; ele pede a
  // abertura por evento porque o estado de aberto vive aqui. A inscrição
  // respeita o mesmo portão do balão: durante o onboarding nada abre.
  useEffect(() => {
    if (!isTutorialCompleted) return;
    return onAgentPanelOpen(openPanel);
    // `openPanel` é recriado a cada render; reinscrever a cada render seria
    // desperdício e a closure só lê `chat.ensureLoaded`, que é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTutorialCompleted]);

  // Hidden until onboarding finishes: the tutorial (manual or AI) should own
  // the user's attention, and the AI wizard already covers assisted setup.
  if (!isTutorialCompleted) {
    return null;
  }

  return (
    <>
      {showFab && !open ? (
        <Pressable
          accessibilityLabel={t('OpenAssistant')}
          accessibilityRole="button"
          onPress={openPanel}
          testID="agent-fab"
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-accent active:scale-95"
          style={{
            // High enough to clear the dashboard's bottom shortcuts row.
            bottom: (insets?.bottom ?? 0) + 70,
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Sparkles size={24} color={theme.onAccent} />
        </Pressable>
      ) : null}

      <AgentChatModal visible={open} onClose={() => setOpen(false)} chat={chat} />
    </>
  );
}
