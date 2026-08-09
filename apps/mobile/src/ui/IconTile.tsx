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
 * The tile behind a habit/task/goal icon. Centring belongs to the component.
 *
 * Unlike the web, the tile does NOT tint the icon: there is no `currentColor` in RN
 * and a View's colour does not cascade to children. The caller passes `color` on the
 * icon (`theme.accent` for `tone="accent"`, `theme.text2` for `neutral`).
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
