import type { ReactNode } from 'react';
import { Pressable, Text, ActivityIndicator, View, type PressableProps } from 'react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';

type Mode = 'primary' | 'tonal' | 'ghost' | 'danger' | 'cancel' | 'create' | 'default';
type Size = 'big' | 'medium' | 'small' | 'auto';

interface Props extends Omit<PressableProps, 'children'> {
  text: string;
  mode?: Mode;
  size?: Size;
  submitting?: boolean;
  icon?: ReactNode;
  /**
   * Extra classes (width, alignment). It MUST be destructured: falling into
   * `...rest` it replaced the computed className and the button lost its
   * background.
   */
  className?: string;
  testID?: string;
}

/**
 * The system's four modes: primary (the screen's action), tonal (a secondary with
 * weight), ghost (quiet) and destructive.
 *
 * `cancel`, `create` and `default` are the old names, kept because 19 files
 * import this button; each points at its new equivalent and disappears as the
 * screens migrate.
 */
const MODE: Record<Mode, string> = {
  primary: 'bg-accent active:bg-accent-strong',
  tonal: 'bg-accent-soft active:opacity-80',
  ghost: 'bg-transparent active:bg-surface-2',
  danger: 'bg-danger/10 active:opacity-80',
  // old-model aliases
  cancel: 'bg-surface-2 active:opacity-80',
  create: 'bg-accent active:bg-accent-strong',
  default: 'bg-surface border border-border active:bg-surface-2',
};

const MODE_TEXT: Record<Mode, string> = {
  primary: 'text-on-accent',
  tonal: 'text-accent',
  ghost: 'text-text-2',
  danger: 'text-danger',
  cancel: 'text-text-2',
  create: 'text-on-accent',
  default: 'text-text',
};

// Unlike the web, the fixed width STAYS: native screens stack the CTA in a
// centred column, and a button that shrinks with its text would break that
// rhythm. `auto` is the way out for anyone wanting the web behaviour.
const SIZE: Record<Size, string> = {
  big: 'w-[250px] h-[52px]',
  medium: 'w-[180px] h-[48px]',
  small: 'w-[120px] h-[44px]',
  auto: 'h-11 px-6',
};

export default function Button({
  text,
  mode = 'create',
  size = 'big',
  submitting,
  disabled,
  icon,
  className = '',
  testID,
  ...rest
}: Props) {
  const { theme } = useBeyouTheme();
  const isDisabled = disabled || submitting;
  // The spinner can only be onAccent over the solid accent; on the light modes it
  // would vanish — hence it falls back to the accent.
  const spinner = mode === 'primary' || mode === 'create' ? theme.onAccent : theme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!submitting }}
      testID={testID}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-control ${MODE[mode]} ${
        SIZE[size]
      } ${isDisabled ? 'opacity-60' : ''} ${className}`}
      {...rest}
    >
      {submitting ? (
        <ActivityIndicator color={spinner} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text className={`${MODE_TEXT[mode]} text-lg font-semibold`}>{text}</Text>
        </>
      )}
    </Pressable>
  );
}
