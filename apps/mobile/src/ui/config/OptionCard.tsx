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
 * option buttons): bordered, highlighted (border-primary + bg-primary/10) when
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
      className={`rounded-lg border p-4 ${
        selected ? 'border-primary bg-primary/10' : 'border-primary/30'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-secondary text-base font-semibold">{title}</Text>
          {description ? (
            <Text className="text-description mt-0.5 text-sm">{description}</Text>
          ) : null}
        </View>
        <View
          className={`mt-0.5 h-5 w-5 rounded-full border-2 ${
            selected ? 'border-primary bg-primary' : 'border-description'
          }`}
        />
      </View>
      {detail ? <Text className="text-description mt-2 text-xs">{detail}</Text> : null}
    </Pressable>
  );
}
