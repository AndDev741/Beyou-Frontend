import { useContext, useRef, useState } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'expo-router';
import { MessageSquareWarning } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { captureCurrentScreen } from './captureScreen';

/**
 * R1: feedback is reachable from every authenticated screen. Mounted once in
 * the (app) layout, mirroring AgentWidget.
 *
 * KTD3/R9: this is the intact-screen path — the snapshot is taken HERE, before
 * navigating, because once the feedback form is on top there is nothing left of
 * the screen the user wanted to talk about.
 */
export default function FeedbackLauncher() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useContext(SafeAreaInsetsContext);
  const isTutorialCompleted = useSelector((state: RootState) => state.perfil.isTutorialCompleted);
  const [capturing, setCapturing] = useState(false);
  // `disabled={capturing}` only takes effect once React has committed the state
  // — and `captureCurrentScreen()` is a native call, so the gap is wide enough
  // for a real double-tap to land twice. Two captures and two `router.push`
  // calls leave a duplicated feedback screen on the navigation stack, so the
  // guard that actually holds has to be synchronous. The `disabled` prop stays:
  // it is what makes the button LOOK busy.
  const opening = useRef(false);

  // Hidden during onboarding for the same reason the assistant FAB is: the
  // tutorial spotlight owns the screen, and a floating control outside the hole
  // is noise the new user has to ignore.
  if (!isTutorialCompleted) return null;
  // No point offering "give feedback" while the feedback form is open.
  if (pathname === '/feedback') return null;

  const open = async () => {
    if (opening.current) return;
    opening.current = true;

    setCapturing(true);
    try {
      const capture = await captureCurrentScreen();
      setCapturing(false);
      router.push({
        pathname: '/feedback',
        params: { from: pathname, ...(capture ? { capture: capture.uri } : {}) },
      });
    } finally {
      opening.current = false;
    }
  };

  return (
    <Pressable
      accessibilityLabel={t('FeedbackNavLabel')}
      accessibilityRole="button"
      onPress={open}
      disabled={capturing}
      testID="feedback-fab"
      className="absolute right-5 h-11 w-11 items-center justify-center rounded-full border border-primary bg-background active:scale-95"
      style={{
        // Sits directly above the assistant FAB's slot.
        bottom: (insets?.bottom ?? 0) + 134,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      {capturing ? <ActivityIndicator size="small" /> : <MessageSquareWarning size={20} />}
    </Pressable>
  );
}
