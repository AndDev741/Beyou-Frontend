import { useContext, useRef, useState } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'expo-router';
import { MessageSquareWarning } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { captureCurrentScreen } from './captureScreen';

/** The one screen that carries the bubble — see the note on the component. */
const FEEDBACK_HOME_ROUTE = '/configuration';

/**
 * R1: feedback is reachable from every authenticated screen — in two taps.
 *
 * The bubble itself lives on the configuration screen only. `BottomNav` is
 * mounted in the (app) layout now, so Config is one tap from anywhere and
 * Config carries the bubble: feedback is two taps from any screen without
 * spending a seventh slot in a six-item bar (a seventh item has been declined
 * twice). A bubble floating over every screen buys one tap and costs permanent
 * furniture on a small display.
 *
 * The web app applies the same table with one extra row: at desktop widths it
 * keeps the bubble on the other sections, because there is no bottom bar there.
 * Native has no desktop width, so the rule collapses to Config only.
 *
 * Still mounted in the layout rather than inside the configuration screen: this
 * is the intact-screen capture path (KTD3/R9) and the snapshot is taken HERE,
 * before navigating, because once the feedback form is on top there is nothing
 * left of the screen the user wanted to talk about.
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
  // Everywhere else — including the feedback form itself, where the offer would
  // be pointless — the bar's Config entry is the way in.
  if (pathname !== FEEDBACK_HOME_ROUTE) return null;

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
