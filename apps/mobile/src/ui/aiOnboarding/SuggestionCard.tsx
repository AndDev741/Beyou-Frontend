import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';

const ON_PRIMARY = '#FFFFFF';

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
      className={`relative w-full flex-row items-start gap-3 rounded-2xl border p-3 ${
        selected ? 'border-primary bg-primary/10' : 'border-primary/20 bg-secondary/5'
      }`}
    >
      {/* Check badge */}
      {selected ? (
        <View className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check size={12} color={ON_PRIMARY} strokeWidth={3} />
        </View>
      ) : null}

      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${
          selected ? 'bg-primary/20' : 'bg-primary/10'
        }`}
      >
        <BeyouIcon id={iconId} size={20} color={theme.primary} />
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-secondary font-semibold leading-snug">{name}</Text>
        <Text className="text-description text-sm leading-snug" numberOfLines={2}>
          {description}
        </Text>
      </View>

      {meta ? <View className="shrink-0 self-start pt-0.5">{meta}</View> : null}
    </Pressable>
  );
}
