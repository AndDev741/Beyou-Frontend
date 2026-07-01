import { type ReactNode, type RefObject } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import BeyouIcon from '../BeyouIcon';

interface ConfigSectionProps {
  /** lucide/emoji icon id for the section header (e.g. "lucide:user"). */
  iconId?: string;
  title: string;
  description?: string;
  children: ReactNode;
  testID?: string;
  /** Tutorial spotlight target ref (attached to the section root). */
  viewRef?: RefObject<View | null>;
  /** Fires with the section's layout so the tutorial can scroll it into view. */
  onLayout?: (e: LayoutChangeEvent) => void;
}

/** Titled settings section (icon + title + description + body), mirroring the
 *  web ConfigSection. */
export default function ConfigSection({ iconId, title, description, children, testID, viewRef, onLayout }: ConfigSectionProps) {
  return (
    <View className="w-full" testID={testID} ref={viewRef} onLayout={onLayout}>
      <View className="flex-row items-center gap-2">
        {iconId ? <BeyouIcon id={iconId} size={20} /> : null}
        <Text className="text-secondary text-xl font-bold">{title}</Text>
      </View>
      {description ? <Text className="text-description mt-0.5 text-sm">{description}</Text> : null}
      <View className="mt-3">{children}</View>
      {/* Primary divider to visually separate sections. Margin via inline style
          (RN-native, always applies — the NativeWind mt-* util wasn't taking
          effect on refresh); border via className (renders fine). */}
      <View style={{ marginTop: 28, marginBottom: 4 }} className="border-b-2 border-primary" />
    </View>
  );
}
