import { type ReactNode } from 'react';
import { View, Text } from 'react-native';
import BeyouIcon from '../BeyouIcon';

interface ConfigSectionProps {
  /** lucide/emoji icon id for the section header (e.g. "lucide:user"). */
  iconId?: string;
  title: string;
  description?: string;
  children: ReactNode;
  testID?: string;
}

/** Titled settings section (icon + title + description + body), mirroring the
 *  web ConfigSection. */
export default function ConfigSection({ iconId, title, description, children, testID }: ConfigSectionProps) {
  return (
    <View className="w-full" testID={testID}>
      <View className="flex-row items-center gap-2">
        {iconId ? <BeyouIcon id={iconId} size={20} /> : null}
        <Text className="text-secondary text-xl font-bold">{title}</Text>
      </View>
      {description ? <Text className="text-description mt-0.5 text-sm">{description}</Text> : null}
      <View className="mt-3">{children}</View>
      {/* Primary divider to visually separate sections (solid border — a
          translucent 1px line was imperceptible on device). */}
      <View className="mt-5 border-b-2 border-primary" />
    </View>
  );
}
