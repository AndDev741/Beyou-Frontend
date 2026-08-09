import type { ReactNode, Ref } from 'react';
import { View, Pressable, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: ReactNode;
  /** Spotlight target for the tutorial — the cards that anchor a step pass it. */
  ref?: Ref<View>;
  /** Reacts to touch — for tappable list cards. Only does anything with `onPress`. */
  interactive?: boolean;
  /** Highlights the card with the accent (selected item; a done goal uses `tone`). */
  selected?: boolean;
  tone?: 'default' | 'success';
  padded?: boolean;
  onPress?: () => void;
  className?: string;
}

/**
 * The system's surface. Replaces the `bg-surface + border-primary` pair copied into
 * every card — the redesign trades a blue outline for a surface.
 */
export default function Card({
  children,
  interactive = false,
  selected = false,
  tone = 'default',
  padded = true,
  onPress,
  className = '',
  ref,
  ...rest
}: CardProps) {
  const border = selected ? 'border-accent' : tone === 'success' ? 'border-success' : 'border-border';
  const base = `rounded-card border bg-surface ${border} ${padded ? 'p-4' : ''} ${className}`;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={`${base} ${interactive ? 'active:opacity-80' : ''}`}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View ref={ref} className={base} {...rest}>
      {children}
    </View>
  );
}
