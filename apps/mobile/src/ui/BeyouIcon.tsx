import { type ComponentType } from 'react';
import { Text } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { resolveIcon } from '@beyou/icons';
import { useBeyouTheme } from '../theme/ThemeProvider';

type LucideComp = ComponentType<{ size?: number; color?: string }>;
const icons = LucideIcons as unknown as Record<string, LucideComp>;

/** lucide kebab name -> PascalCase named export (e.g. "a-arrow-down" -> "AArrowDown"). */
const toPascal = (kebab: string) =>
  kebab
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join('');

interface BeyouIconProps {
  id?: string | null;
  size?: number;
  color?: string;
  /** Render a neutral fallback icon for unresolvable ids (default: render nothing). */
  showFallback?: boolean;
}

/**
 * Renders a saved icon id via the shared @beyou/icons resolver: emoji → char,
 * lucide → lucide-react-native component. Unresolvable ids (legacy react-icons,
 * empty) render nothing unless `showFallback`. Mirrors the web BeyouIcon.
 */
export default function BeyouIcon({ id, size = 24, color, showFallback = false }: BeyouIconProps) {
  const { theme } = useBeyouTheme();
  const tint = color ?? theme.icon;
  const descriptor = resolveIcon(id);

  if (descriptor.kind === 'emoji') {
    return <Text style={{ fontSize: size * 0.95 }}>{descriptor.char}</Text>;
  }
  if (descriptor.kind === 'lucide') {
    const Cmp = icons[toPascal(descriptor.name)];
    if (Cmp) return <Cmp size={size} color={tint} />;
  }
  if (showFallback && icons.Circle) {
    const Fallback = icons.Circle;
    return <Fallback size={size} color={tint} />;
  }
  return null;
}
