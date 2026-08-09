import { View, Text } from 'react-native';

interface XpBarProps {
  /** XP accumulated inside the current level. */
  current: number;
  /** XP needed for the next level. */
  target: number;
  level?: number;
  /** Hides the numbers (for a compact card). */
  compact?: boolean;
  className?: string;
  testID?: string;
}

/** XP bar + level label. Numbers always in mono. */
export default function XpBar({
  current,
  target,
  level,
  compact = false,
  className = '',
  testID,
}: XpBarProps) {
  // A target of 0 would happen on a freshly created level and divide by zero.
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
