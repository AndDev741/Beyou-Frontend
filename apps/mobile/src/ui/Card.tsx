import type { ReactNode } from 'react';
import { View, Pressable, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: ReactNode;
  /** Reage ao toque — para cartões clicáveis de lista. Só tem efeito com `onPress`. */
  interactive?: boolean;
  /** Destaca o cartão com o acento (item selecionado; meta concluída usa `tone`). */
  selected?: boolean;
  tone?: 'default' | 'success';
  padded?: boolean;
  onPress?: () => void;
  className?: string;
}

/**
 * A superfície do sistema. Substitui o par `bg-background + border-primary`
 * copiado em cada cartão — o redesign troca contorno azul por superfície.
 */
export default function Card({
  children,
  interactive = false,
  selected = false,
  tone = 'default',
  padded = true,
  onPress,
  className = '',
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
    <View className={base} {...rest}>
      {children}
    </View>
  );
}
