import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Linha de apoio: "melhor: 21", "desde mar". */
  hint?: string;
  className?: string;
  testID?: string;
}

/** A number block for the expanded view (level, streak, check-ins). */
export default function StatTile({ label, value, hint, className = '', testID }: StatTileProps) {
  const isText = typeof value === 'string' || typeof value === 'number';
  return (
    <View
      testID={testID}
      className={`rounded-control border border-border bg-surface px-3 py-2.5 ${className}`}
    >
      <Text className="text-text-3 text-[11px] font-semibold uppercase tracking-wide">{label}</Text>
      {isText ? (
        <Text className="text-text mt-0.5 font-mono-semibold text-lg">{value}</Text>
      ) : (
        <View className="mt-0.5">{value}</View>
      )}
      {hint ? <Text className="text-text-3 text-[11px]">{hint}</Text> : null}
    </View>
  );
}
