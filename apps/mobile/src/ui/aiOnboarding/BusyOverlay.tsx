import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/** BeYou-mechanics tips rotated while the AI thinks, so waiting teaches the app. */
export const BUSY_TIP_KEYS = [
  'AiOnboardingTipXp',
  'AiOnboardingTipStreak',
  'AiOnboardingTipSkip',
  'AiOnboardingTipLevels',
  'AiOnboardingTipGoals',
  'AiOnboardingTipSchedule',
  'AiOnboardingTipAgent',
  'AiOnboardingTipWidgets',
];

const TIP_ROTATE_MS = 4_000;

// Module-level cursor: each new wait continues where the last one stopped,
// so short back-to-back loads don't always show the same first tip.
let tipCursor = 0;

interface BusyOverlayProps {
  label: string;
  visible: boolean;
}

/**
 * Full-screen "AI is thinking" overlay with rotating BeYou tips. Shown only
 * for between-step transitions (in-step actions like the routine regenerate
 * pass `{ overlay: false }` to runGuarded and show their own busy state).
 * The `!visible` gate unmounts the content so the tip interval stops and the
 * cursor advances for the next wait.
 */
export default function BusyOverlay({ label, visible }: BusyOverlayProps) {
  if (!visible) return null;
  return <BusyOverlayContent label={label} />;
}

function BusyOverlayContent({ label }: { label: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [tipIndex, setTipIndex] = useState(() => tipCursor % BUSY_TIP_KEYS.length);

  useEffect(() => {
    const interval = setInterval(() => {
      tipCursor += 1;
      setTipIndex(tipCursor % BUSY_TIP_KEYS.length);
    }, TIP_ROTATE_MS);
    return () => {
      tipCursor += 1; // next wait starts on a fresh tip
      clearInterval(interval);
    };
  }, []);

  return (
    <View
      className="absolute inset-0 items-center justify-center gap-4 bg-background/90 px-6"
      testID="ai-onboarding-busy"
    >
      <View className="h-14 w-14 items-center justify-center">
        <ActivityIndicator size="large" color={theme.primary} />
        <View className="absolute">
          <Sparkles size={18} color={theme.primary} />
        </View>
      </View>
      <Text className="text-secondary text-base font-medium">{label}</Text>

      <View className="mt-2 max-w-[340px] items-center">
        <Text className="text-primary text-center text-xs font-semibold uppercase tracking-wide">
          {t('AiOnboardingTipLabel')}
        </Text>
        <Text
          className="text-description mt-1 text-center text-sm"
          testID="ai-onboarding-tip"
        >
          {t(BUSY_TIP_KEYS[tipIndex])}
        </Text>
      </View>
    </View>
  );
}
