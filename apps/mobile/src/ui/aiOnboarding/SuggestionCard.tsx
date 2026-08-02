import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';


interface SuggestionCardProps {
  iconId: string;
  name: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  /** Right-aligned slot for extra info (importance/difficulty dots, goal target...). */
  meta?: ReactNode;
  testID?: string;
}

/** Selectable suggestion card shared by the habits/tasks/goals wizard steps
 *  (mobile port of the web SuggestionCard). */
export default function SuggestionCard({
  iconId,
  name,
  description,
  selected,
  onPress,
  meta,
  testID,
}: SuggestionCardProps) {
  const { theme } = useBeyouTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      className={`relative w-full flex-row items-start gap-3 rounded-card border p-3 ${
        selected ? 'border-accent bg-accent/10' : 'border-border bg-surface-2/5'
      }`}
    >
      {/* Check badge */}
      {selected ? (
        <View className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-accent">
          <Check size={12} color={theme.onAccent} strokeWidth={3} />
        </View>
      ) : null}

      <View
        className={`h-10 w-10 items-center justify-center rounded-card ${
          selected ? 'bg-accent/20' : 'bg-accent/10'
        }`}
      >
        <BeyouIcon id={iconId} size={20} color={theme.primary} />
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-text font-semibold leading-snug">{name}</Text>
        <Text className="text-text-2 text-sm leading-snug" numberOfLines={2}>
          {description}
        </Text>
      </View>

      {meta ? <View className="shrink-0 self-start pt-0.5">{meta}</View> : null}
    </Pressable>
  );
}
