import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { mergeSectionItems, formatItemRange } from './sectionItems';

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');

interface SectionCardProps {
  section: RoutineSection;
  index: number;
  count: number;
  habits: habit[];
  tasks: task[];
  onEdit: () => void;
  onAssign: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

export default function SectionCard({ section, index, count, habits, tasks, onEdit, onAssign, onMove, onRemove }: SectionCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const items = mergeSectionItems(section, habits, tasks);
  return (
    <View className="rounded-2xl border border-primary/20 bg-background p-3">
      <View className="flex-row items-center gap-2">
        <BeyouIcon id={section.iconId} size={18} />
        <Text className="text-secondary flex-1 text-base font-bold" numberOfLines={1}>{section.name}</Text>
        <Text className="text-description text-xs">{[fmt(section.startTime), fmt(section.endTime)].filter(Boolean).join(' - ')}</Text>
        <Pressable onPress={() => onMove(-1)} disabled={index === 0} accessibilityRole="button" testID="section-up" className={index === 0 ? 'opacity-30' : ''}>
          <Ionicons name="chevron-up" size={20} color={theme.primary} />
        </Pressable>
        <Pressable onPress={() => onMove(1)} disabled={index === count - 1} accessibilityRole="button" testID="section-down" className={index === count - 1 ? 'opacity-30' : ''}>
          <Ionicons name="chevron-down" size={20} color={theme.primary} />
        </Pressable>
      </View>

      {/* Assigned items preview — shows how the routine will look. */}
      {items.length > 0 ? (
        <View className="mt-2 gap-1.5 border-t border-primary/10 pt-2">
          {items.map((item) => {
            const range = formatItemRange(item.startTime, item.endTime);
            return (
              <View key={item.key} className="flex-row items-center gap-2">
                <BeyouIcon id={item.iconId} size={15} />
                <Text className="text-secondary flex-1 text-sm" numberOfLines={1}>{item.name}</Text>
                {range ? <Text className="text-description text-xs">{range}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="mt-2 flex-row gap-3">
        <Pressable onPress={onEdit} accessibilityRole="button" testID="section-edit"><Text className="text-primary text-sm font-semibold">{t('Edit')}</Text></Pressable>
        <Pressable onPress={onAssign} accessibilityRole="button" testID="section-assign"><Text className="text-primary text-sm font-semibold">{t('AssignItems')} ({items.length})</Text></Pressable>
        <Pressable onPress={onRemove} accessibilityRole="button" testID="section-remove" className="ml-auto"><Text className="text-error text-sm font-semibold">{t('Delete')}</Text></Pressable>
      </View>
    </View>
  );
}
