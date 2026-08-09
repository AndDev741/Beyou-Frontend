import { type ReactNode } from 'react';
import { View, Text } from 'react-native';
import Card from '../Card';

interface WidgetCardProps {
  title: string;
  /** Header icon (14.5px, in text-3). */
  icon?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/**
 * Every widget's frame — mirror of the web's `baseDiv`: the surface, a quiet header
 * with the icon on the left, and the content below.
 *
 * The title used to be centred and large; now it is the 12.5px line in `text-2`
 * that the rest of the system uses for a label. The widget is the data, not the
 * title.
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
