import { type ReactNode } from 'react';
import { View, Text } from 'react-native';
import Card from '../Card';

interface WidgetCardProps {
  title: string;
  /** Ícone do cabeçalho (14.5px, em text-3). */
  icon?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/**
 * A moldura de todo widget — espelho do `baseDiv` da web: superfície, cabeçalho
 * discreto com ícone à esquerda e o conteúdo abaixo.
 *
 * O título era centralizado e grande; agora é a linha de 12.5px em `text-2` que
 * o resto do sistema usa para rótulo. O widget é o dado, não o título.
 */
export default function WidgetCard({ title, icon, children, testID }: WidgetCardProps) {
  return (
    <Card
      padded={false}
      className="w-full px-[18px] py-4"
      testID={testID}
    >
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-[12.5px] font-semibold text-text-2">{title}</Text>
      </View>
      {children}
    </Card>
  );
}
