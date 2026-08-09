import { View, Text, Pressable } from 'react-native';

interface OptionCardProps {
  title: string;
  description?: string;
  /** Optional smaller third line under the description. */
  detail?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * Reusable selectable card (mirrors the web RoutineSettings / ConstanceConfiguration
 * option buttons): bordered, highlighted (border-border + bg-accent/10) when
 * selected, with a small radio dot on the right. Used by the xp-decay and
 * constance pickers.
 */
export default function OptionCard({
  title,
  description,
  detail,
  selected,
  onPress,
  testID,
}: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      className={`rounded-control border p-4 ${
        selected ? 'border-accent bg-accent/10' : 'border-border'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[13.5px] font-semibold text-text">{title}</Text>
          {description ? (
            <Text className="mt-0.5 text-xs text-text-3">{description}</Text>
          ) : null}
        </View>
        <View
          className={`mt-0.5 h-5 w-5 rounded-full border-2 ${
            selected ? 'border-accent bg-accent' : 'border-border'
          }`}
        />
      </View>
      {detail ? <Text className="text-text-2 mt-2 text-xs">{detail}</Text> : null}
    </Pressable>
  );
}
