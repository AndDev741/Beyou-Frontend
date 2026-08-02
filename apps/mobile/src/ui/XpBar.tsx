import { View, Text } from 'react-native';

interface XpBarProps {
  /** XP acumulado dentro do nível atual. */
  current: number;
  /** XP necessário para o próximo nível. */
  target: number;
  level?: number;
  /** Esconde os números (uso em cartão compacto). */
  compact?: boolean;
  className?: string;
  testID?: string;
}

/** Barra de XP + rótulo de nível. Números sempre em mono. */
export default function XpBar({
  current,
  target,
  level,
  compact = false,
  className = '',
  testID,
}: XpBarProps) {
  // target 0 aconteceria num nível recém-criado e dividiria por zero.
  const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

  return (
    <View className={className} testID={testID}>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </View>
      {!compact && (
        <View className="mt-1 flex-row items-center justify-between">
          {level !== undefined ? (
            <Text className="text-text-2 font-mono-semibold text-[11px]">LV {level}</Text>
          ) : null}
          <Text className="text-text-3 ml-auto font-mono text-[11px]">
            {current}/{target}
          </Text>
        </View>
      )}
    </View>
  );
}
