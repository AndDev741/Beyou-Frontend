import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface PillButtonProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  tone?: 'neutral' | 'accent';
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * The Ideas screen's small actions (Tidy up, Show all, Archived, Back to the board): an icon and
 * a short label in a pill. `Button` is sized for a form's main action, and three of those do not
 * fit one row on a 360dp phone.
 */
export default function PillButton({
  label,
  icon,
  onPress,
  tone = 'neutral',
  busy = false,
  disabled = false,
  testID,
}: PillButtonProps) {
  const { theme } = useBeyouTheme();
  const accent = tone === 'accent';
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      testID={testID}
      className={`min-h-9 shrink flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
        accent ? 'bg-accent-soft' : 'border border-border bg-surface'
      } ${off ? 'opacity-60' : 'active:opacity-80'}`}
    >
      <View>{busy ? <ActivityIndicator size="small" color={theme.accent} /> : icon}</View>
      <Text
        className={`shrink text-[12.5px] font-semibold ${accent ? 'text-accent' : 'text-text-2'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
