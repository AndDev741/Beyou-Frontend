import { useContext, useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Sparkles } from 'lucide-react-native';
import type { RootState } from '../../store';
import AgentChatModal from './AgentChatModal';
import { useAgentChat } from './useAgentChat';

/**
 * Global AI assistant entry point, mounted once in the (app) layout so it
 * floats over every authenticated screen. Chat state lives here (via
 * useAgentChat), so closing the modal or navigating never loses the thread.
 */
export default function AgentWidget() {
  const { t } = useTranslation();
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

  // Hidden until onboarding finishes: the tutorial (manual or AI) should own
  // the user's attention, and the AI wizard already covers assisted setup.
  if (!isTutorialCompleted) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityLabel={t('OpenAssistant')}
        accessibilityRole="button"
        onPress={openPanel}
        testID="agent-fab"
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-primary active:scale-95"
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
        <Sparkles size={24} color="#ffffff" />
      </Pressable>

      <AgentChatModal visible={open} onClose={() => setOpen(false)} chat={chat} />
    </>
  );
}
