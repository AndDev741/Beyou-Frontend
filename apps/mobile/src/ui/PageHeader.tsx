import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface PageHeaderProps {
  title: string;
  /** Linha de contexto: contagens, data, resumo. */
  subtitle?: string;
  /** Ação primária da página (criar). */
  action?: ReactNode;
  className?: string;
  testID?: string;
}

/** Cabeçalho de página: título, contexto e a ação primária à direita. */
export default function PageHeader({
  title,
  subtitle,
  action,
  className = '',
  testID,
}: PageHeaderProps) {
  return (
    <View
      testID={testID}
      className={`mb-5 flex-row flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <View className="shrink">
        <Text accessibilityRole="header" className="text-text text-2xl font-semibold">
          {title}
        </Text>
        {subtitle ? <Text className="text-text-2 mt-1 text-sm">{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
