import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { useBeyouTheme } from '../theme/ThemeProvider';
import IconTile from './IconTile';

interface EmptyStateProps {
  /** The entity's icon (lucide). Never an emoji: the empty state is system. */
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Quiet secondary action ("or ask the Assistant"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /**
   * A search or filter with no result: the CTA turns ghost. There is nothing to
   * create — the way out is clearing the filter, not a primary button demanding
   * attention.
   */
  variant?: 'default' | 'ghost';
  /** When given, shows the × that dismisses the invitation for good. */
  onDismiss?: () => void;
  testID?: string;
}

/**
 * Mirror of the web's EmptyState: an IconTile with the entity's icon, a short
 * title, one line saying how to fill it, and a single CTA.
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  variant = 'default',
  onDismiss,
  testID,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const ghost = variant === 'ghost';

  return (
    <View
      testID={testID}
      className="w-full items-center justify-center rounded-card border border-dashed border-border bg-surface p-8"
    >
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('Dismiss')}
          testID={testID ? `${testID}-dismiss` : 'empty-state-dismiss'}
          className="absolute right-2 top-2 rounded-control p-2 active:bg-surface-2"
        >
          <X size={15} color={theme.text3} />
        </Pressable>
      ) : null}

      <IconTile tone="accent" size={44}>
        {icon}
      </IconTile>

      <Text className="mt-3 text-center text-[15px] font-semibold text-text">{title}</Text>
      {description ? (
        <Text className="mt-1.5 max-w-[16rem] text-center text-[12.5px] text-text-3">
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          testID={testID ? `${testID}-action` : 'empty-state-action'}
          className={
            ghost
              ? 'mt-4 rounded-control px-4 py-2 active:bg-accent-soft'
              : 'mt-4 rounded-control bg-accent px-5 py-2.5 active:opacity-80'
          }
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: ghost ? theme.accent : theme.onAccent }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}

      {secondaryLabel && onSecondary ? (
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          testID={testID ? `${testID}-secondary` : 'empty-state-secondary'}
          className="mt-2 px-2 py-1"
        >
          <Text className="text-[12.5px] font-semibold" style={{ color: theme.accent }}>
            {secondaryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
