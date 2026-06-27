import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { task } from '@beyou/types/tasks/taskType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { scaleColor, importanceKey, difficultyKey } from '../habits/levelLabels';

interface TaskCardProps {
  task: task;
  onEdit: (task: task) => void;
  onDelete: (task: task) => void;
}

function ScaleRow({ label, value, phraseKey }: { label: string; value: number; phraseKey: string }) {
  const { t } = useTranslation();
  if (!phraseKey) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-secondary text-sm font-semibold">{label}:</Text>
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: scaleColor(value) }} />
      <Text className="text-description text-sm">{t(phraseKey)}</Text>
    </View>
  );
}

/** Chips for a task's categories (stored as a Record keyed by category id). */
function CategoryChips({ categories }: { categories: task['categories'] }) {
  const entries = Object.entries(categories ?? {});
  if (!entries.length) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {entries.map(([id, cat]) => (
        <View key={id} className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
          <BeyouIcon id={cat.iconId} size={12} />
          <Text className="text-primary text-xs">{cat.name}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Task list card — a simpler HabitCard (no gamification). Collapsed shows icon +
 * name + description + a one-time badge; tapping expands to categories,
 * importance/difficulty and the Edit/Delete actions.
 */
export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [expanded, setExpanded] = useState(false);
  const hasCategories = Object.keys(task.categories ?? {}).length > 0;

  return (
    <View className="rounded-2xl border border-primary/20 bg-background p-4">
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={task.name}
        accessibilityState={{ expanded }}
        testID={`task-card-${task.id}`}
        className="flex-row items-center gap-3"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BeyouIcon id={task.iconId} size={24} showFallback />
        </View>
        <View className="flex-1">
          <Text className="text-secondary text-base font-bold" numberOfLines={expanded ? undefined : 1}>
            {task.name}
          </Text>
          {task.description ? (
            <Text className="text-description text-sm" numberOfLines={expanded ? undefined : 2}>
              {task.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.description} />
      </Pressable>

      {task.oneTimeTask ? (
        <View className="mt-2 flex-row items-center gap-1.5">
          <Ionicons name="alert-circle-outline" size={16} color={theme.icon} />
          <Text className="text-secondary text-sm">{t('One Time Task')}</Text>
          {task.markedToDelete ? (
            <Text className="text-error text-xs font-semibold underline">{t('And Marked to Delete')}</Text>
          ) : null}
        </View>
      ) : null}

      {!expanded && hasCategories ? <View className="mt-3"><CategoryChips categories={task.categories} /></View> : null}

      {expanded ? (
        <View className="mt-4 gap-3 border-t border-primary/10 pt-3">
          {hasCategories ? (
            <View className="gap-1">
              <Text className="text-secondary text-sm font-semibold">{t('Categories')}</Text>
              <CategoryChips categories={task.categories} />
            </View>
          ) : null}

          <ScaleRow label={t('Importance')} value={task.importance ?? 0} phraseKey={importanceKey(task.importance ?? 0)} />
          <ScaleRow label={t('Difficulty')} value={task.difficulty ?? 0} phraseKey={difficultyKey(task.difficulty ?? 0)} />

          <View className="mt-1 flex-row gap-3">
            <Pressable
              onPress={() => onEdit(task)}
              accessibilityRole="button"
              testID={`task-edit-${task.id}`}
              className="flex-1 items-center rounded-lg bg-primary py-2.5"
            >
              <Text style={{ color: theme.background }} className="font-semibold">{t('Edit')}</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(task)}
              accessibilityRole="button"
              testID={`task-delete-${task.id}`}
              className="flex-1 items-center rounded-lg border border-error py-2.5"
            >
              <Text className="text-error font-semibold">{t('Delete')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
