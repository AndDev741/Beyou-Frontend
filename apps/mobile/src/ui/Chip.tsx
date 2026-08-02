import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

export type ChipVariant = 'neutral' | 'accent' | 'xp' | 'flame' | 'time' | 'ok' | 'danger';

interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
  testID?: string;
}

/**
 * Etiqueta de dado: streak, XP, horário, categoria, status.
 *
 * XP e horário são NÚMERO, então vão em mono — é o que mantém a coluna da
 * direita dos itens de rotina alinhada.
 */
const VARIANTS: Record<ChipVariant, { box: string; text: string }> = {
  neutral: { box: 'bg-surface-2', text: 'text-text-2 font-semibold' },
  accent: { box: 'bg-accent-soft', text: 'text-accent font-semibold' },
  xp: { box: 'bg-xp-soft', text: 'text-xp font-mono-semibold' },
  flame: { box: 'bg-flame-soft', text: 'text-flame font-semibold' },
  time: { box: 'bg-surface-2', text: 'text-text-3 font-mono-semibold' },
  ok: { box: 'bg-success/10', text: 'text-success font-semibold' },
  danger: { box: 'bg-danger/10', text: 'text-danger font-semibold' },
};

export default function Chip({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  testID,
}: ChipProps) {
  const box = size === 'sm' ? 'h-5 px-2 gap-1' : 'h-6 px-2.5 gap-1.5';
  const fontSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const { box: tone, text } = VARIANTS[variant];
  const isText = typeof children === 'string' || typeof children === 'number';

  return (
    <View
      testID={testID}
      className={`flex-row shrink-0 items-center rounded-full ${box} ${tone} ${className}`}
    >
      {icon}
      {isText ? <Text className={`${fontSize} ${text}`}>{children}</Text> : children}
    </View>
  );
}
