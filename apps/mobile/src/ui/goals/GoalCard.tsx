import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { goal } from '@beyou/types/goals/goalType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useGoalActions } from './useGoalActions';

interface GoalCardProps {
  goal: goal;
  onEdit: (goal: goal) => void;
  onDelete: (goal: goal) => void;
  /** Refetch goals (e.g. after completing, which changes status server-side). */
  onChanged: () => void;
  /** Start expanded — e.g. when opened from a dashboard goal tap. */
  initialExpanded?: boolean;
}

const STATUS_KEY: Record<string, string> = { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' };
const TERM_KEY: Record<string, string> = { SHORT_TERM: 'Short Term', MEDIUM_TERM: 'Medium Term', LONG_TERM: 'Long Term' };
const fmtDate = (v: Date | string | undefined) => (!v ? '' : typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10));

export default function GoalCard({ goal, onEdit, onDelete, onChanged, initialExpanded }: GoalCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { increase, decrease, complete } = useGoalActions();
  const [expanded, setExpanded] = useState(initialExpanded ?? false);
  const [pending, setPending] = useState(false);

  const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
  const done = goal.complete;
  const dateRange = [fmtDate(goal.startDate), fmtDate(goal.endDate)].filter(Boolean).join(' → ');
  const categoryEntries = Object.entries(goal.categories ?? {});

  const run = async (fn: () => Promise<unknown>, refetch = false) => {
    if (pending) return;
    setPending(true);
    await fn();
    if (refetch) onChanged();
    setPending(false);
  };

  return (
    <View className="rounded-2xl border border-primary/20 bg-background p-4">
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={goal.name}
        accessibilityState={{ expanded }}
        testID={`goal-card-${goal.id}`}
        className="flex-row items-center gap-3"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BeyouIcon id={goal.iconId} size={24} showFallback />
        </View>
        <View className="flex-1">
          <Text className="text-secondary text-base font-bold" numberOfLines={expanded ? undefined : 1}>{goal.name}</Text>
          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            <Text className="text-description text-xs">{t(TERM_KEY[goal.term] ?? goal.term)}</Text>
            <Text className="text-description text-xs">·</Text>
            <Text className={`text-xs ${done ? 'text-primary font-semibold' : 'text-description'}`}>{t(STATUS_KEY[goal.status] ?? goal.status)}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.description} />
      </Pressable>

      {/* Progress */}
      <View className="mt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-description text-xs">{goal.currentValue}/{goal.targetValue} {goal.unit}</Text>
          <Text className="text-description text-xs">{pct}%</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/15">
          <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </View>
      </View>

      {/* Quick progress + complete */}
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => run(() => decrease(goal.id))}
          disabled={pending || done}
          accessibilityRole="button"
          accessibilityLabel={t('Decrease') || 'Decrease'}
          testID={`goal-decrease-${goal.id}`}
          className={`h-9 w-9 items-center justify-center rounded-full border border-primary/40 ${done ? 'opacity-40' : ''}`}
        >
          <Ionicons name="remove" size={20} color={theme.primary} />
        </Pressable>
        <Pressable
          onPress={() => run(() => increase(goal.id))}
          disabled={pending || done}
          accessibilityRole="button"
          accessibilityLabel={t('Increase') || 'Increase'}
          testID={`goal-increase-${goal.id}`}
          className={`h-9 w-9 items-center justify-center rounded-full border border-primary/40 ${done ? 'opacity-40' : ''}`}
        >
          <Ionicons name="add" size={20} color={theme.primary} />
        </Pressable>

        {done ? (
          <View className="ml-auto flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text className="text-primary text-sm font-semibold">{t('Completed')}</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => run(() => complete(goal.id), true)}
            disabled={pending}
            accessibilityRole="button"
            testID={`goal-complete-${goal.id}`}
            className="ml-auto flex-row items-center gap-1 rounded-full bg-primary px-3 py-1.5"
          >
            <Ionicons name="checkmark" size={16} color={theme.background} />
            <Text style={{ color: theme.background }} className="text-sm font-semibold">{t('MarkAsComplete')}</Text>
          </Pressable>
        )}
      </View>

      {expanded ? (
        <View className="mt-4 gap-3 border-t border-primary/10 pt-3">
          {goal.description ? <Text className="text-description text-sm">{goal.description}</Text> : null}
          {goal.motivation ? (
            <View className="gap-0.5">
              <Text className="text-secondary text-sm font-semibold">{t('Motivation')}</Text>
              <Text className="text-description text-sm italic">"{goal.motivation}"</Text>
            </View>
          ) : null}
          {dateRange ? <Text className="text-description text-xs">{dateRange}</Text> : null}
          <Text className="text-description text-xs">+{goal.xpReward} XP</Text>
          {categoryEntries.length ? (
            <View className="flex-row flex-wrap gap-1.5">
              {categoryEntries.map(([id, cat]) => (
                <View key={id} className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                  <BeyouIcon id={cat.iconId} size={12} />
                  <Text className="text-primary text-xs">{cat.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="flex-row gap-3">
            <Pressable onPress={() => onEdit(goal)} accessibilityRole="button" testID={`goal-edit-${goal.id}`} className="flex-1 items-center rounded-lg bg-primary py-2.5">
              <Text style={{ color: theme.background }} className="font-semibold">{t('Edit')}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(goal)} accessibilityRole="button" testID={`goal-delete-${goal.id}`} className="flex-1 items-center rounded-lg border border-error py-2.5">
              <Text className="text-error font-semibold">{t('Delete')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
