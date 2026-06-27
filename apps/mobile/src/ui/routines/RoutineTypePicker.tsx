import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface RoutineTypePickerProps {
  onChoose: (type: 'daily') => void;
}

const DAILY_ITEMS = [
  { name: 'Drink water', start: '06:05', end: '06:10' },
  { name: 'Meditate', start: '06:15', end: '06:25' },
  { name: 'Physical exercise', start: '06:30', end: '07:00' },
] as const;
const TODO_ITEMS = ['Buy groceries', 'Call mom', 'Read a book'] as const;

/** Mirrors the web `CreateRoutine` type step: pick Daily (active) or Todo (disabled). */
export default function RoutineTypePicker({ onChoose }: RoutineTypePickerProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  return (
    <View className="gap-5">
      <Text className="text-secondary text-center text-xl">{t('Do you want a')}</Text>

      {/* Daily — active */}
      <View className="gap-2">
        <Text className="text-secondary text-center text-base">{t('Daily Routine')}</Text>
        <Pressable
          onPress={() => onChoose('daily')}
          accessibilityRole="button"
          testID="routine-type-daily"
          className="rounded-lg border-2 border-primary bg-background p-3 active:opacity-80"
        >
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="sunny-outline" size={22} color={theme.primary} />
            <Text className="text-secondary flex-1 text-base font-semibold">{t('Morning')}</Text>
            <Text className="text-primary text-xs">06:00 - 08:00</Text>
          </View>
          {DAILY_ITEMS.map((item) => (
            <View key={item.name} className="flex-row items-center gap-2 py-0.5">
              <Ionicons name="square-outline" size={18} color={theme.primary} />
              <Text className="text-secondary flex-1 text-sm">{t(item.name)}</Text>
              <Text className="text-description text-xs">{item.start} - {item.end}</Text>
            </View>
          ))}
        </Pressable>
      </View>

      {/* Todo — disabled */}
      <View className="gap-1 mt-4">
        <Text className="text-placeholder text-center text-base">{t('Todo Routine')}</Text>
        <Text className="text-placeholder text-center text-xs">{t('Not available yet')}</Text>
        <View className="rounded-lg border-2 border-placeholder/40 bg-background p-3 opacity-60">
          <Text className="text-placeholder mb-3 text-center text-base font-semibold">{t('Routine')}</Text>
          {TODO_ITEMS.map((item) => (
            <View key={item} className="flex-row items-center gap-2 py-0.5">
              <Ionicons name="square-outline" size={18} color={theme.placeholder} />
              <Text className="text-placeholder flex-1 text-sm">{t(item)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
