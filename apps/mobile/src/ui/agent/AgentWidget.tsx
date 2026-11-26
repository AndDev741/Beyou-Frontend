import { useContext, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import type { RootState } from '../../store';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import AgentChatModal from './AgentChatModal';
import { onAgentPanelOpen } from './agentPanelBus';
import { useAgentChat } from './useAgentChat';
import { useAiAllowed } from '../../aiConsent/useAiConsent';

interface AgentWidgetProps {
  /**
   * Draws the floating bubble. A host that already offers its own trigger — the
   * centre button of `BottomNav`, which is every signed-in screen on mobile —
   * passes `false` and lets the bar be the way in; the conversation still lives
   * here. Defaults to `true` for anyone mounting the widget on its own, with no
   * bar (the same cut as the web, where the bubble only appears from `lg`, the
   * width at which the bottom bar does not exist).
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
  const router = useRouter();
  const aiAllowed = useAiAllowed();

  // After a "no" to the AI provider every way into the assistant (the bar's centre button,
  // Second Brain's hand-off, the bubble) lands on the consent screen instead: the person sees
  // what saying yes would send, and nothing loads or streams until they do.
  const openPanel = () => {
    if (!aiAllowed) {
      router.push('/ai-consent');
      return;
    }
    chat.ensureLoaded();
    setOpen(true);
  };

  // The bottom bar's centre button is the phone trigger; it asks for the panel
  // through an event because the open state lives here. The subscription obeys
  // the same gate as the bubble: during onboarding nothing opens.
  // Deps are the gate alone: `openPanel` is recreated every render, and
  // resubscribing every render would change nothing — the closure only uses
  // `setOpen` and `chat.ensureLoaded`, both stable (useCallback with no mutable
  // deps).
  useEffect(() => {
    if (!isTutorialCompleted) return;
    return onAgentPanelOpen(openPanel);
  }, [isTutorialCompleted, aiAllowed]);

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
