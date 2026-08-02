import type { ReactNode } from 'react';
import { View } from 'react-native';

interface IconTileProps {
  children: ReactNode;
  size?: number;
  tone?: 'accent' | 'neutral';
  className?: string;
  testID?: string;
}

/**
 * O tile atrás do ícone de hábito/tarefa/meta. A centralização é do componente.
 *
 * Diferente da web, o tile NÃO tinge o ícone: não existe `currentColor` no RN e
 * cor de View não desce para os filhos. Quem usa passa `color` no ícone
 * (`theme.accent` para `tone="accent"`, `theme.text2` para `neutral`).
 */
export default function IconTile({
  children,
  size = 34,
  tone = 'accent',
  className = '',
  testID,
}: IconTileProps) {
  return (
    <View
      testID={testID}
      style={{ width: size, height: size }}
      className={`shrink-0 items-center justify-center rounded-control ${
        tone === 'accent' ? 'bg-accent-soft' : 'bg-surface-2'
      } ${className}`}
    >
      {children}
    </View>
  );
}
