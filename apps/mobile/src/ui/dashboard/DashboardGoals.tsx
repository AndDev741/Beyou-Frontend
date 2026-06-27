import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { sortGoalsByTime } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

const BUCKETS = [
  { key: 'thisWeek', title: 'This Week' },
  { key: 'thisMonth', title: 'This Month' },
  { key: 'thisYear', title: 'This Year' },
  { key: 'beyond', title: 'Future Goals' },
  { key: 'past', title: 'Past Goals' },
] as const;

const fmtDate = (v: Date | string | undefined) =>
  !v ? '' : typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10);

function GoalRow({ goal, onPress }: { goal: goal; onPress: () => void }) {
  const { theme } = useBeyouTheme();
  const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
  const steps = `${goal.currentValue} / ${goal.targetValue}${goal.unit ? ` ${goal.unit}` : ''}`;
  const dateRange = [fmtDate(goal.startDate), fmtDate(goal.endDate)].filter(Boolean).join(' → ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={goal.name}
      testID={`dash-goal-${goal.id}`}
      className="flex-row items-center gap-3 rounded-xl border border-primary/15 bg-background p-3 active:opacity-80"
    >
      <BeyouIcon id={goal.iconId} size={20} showFallback />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-secondary flex-1 text-sm font-semibold" numberOfLines={1}>{goal.name}</Text>
          <Text className="text-description text-xs">{steps}</Text>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-primary/15">
          <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </View>
        {dateRange ? <Text className="text-description text-[11px]">{dateRange}</Text> : null}
      </View>
      {goal.complete ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
      ) : (
        <Text className="text-description text-xs">{pct}%</Text>
      )}
    </Pressable>
  );
}

/**
 * Dashboard goals view (mirrors the web GoalsTab): goals from the slice bucketed by
 * end date (this week / month / year / future / past), with filter chips, rendered
 * read-only. Tapping a goal — or the header — opens the Goals screen. Renders
 * nothing when the user has no goals.
 */
export default function DashboardGoals() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const goals = useSelector((s: RootState) => s.goals.goals);
  const sorted = useMemo(() => sortGoalsByTime(goals ?? []), [goals]);
  const [tags, setTags] = useState<string[]>(['all']);

  const sections = useMemo(
    () => BUCKETS.map((b) => ({ ...b, goals: sorted[b.key] })).filter((s) => s.goals.length > 0),
    [sorted],
  );

  if (!goals?.length || sections.length === 0) return null;

  const isAll = tags.includes('all');
  const toggle = (key: string) =>
    setTags((prev) => {
      if (key === 'all') return ['all'];
      const without = prev.filter((x) => x !== 'all');
      const next = without.includes(key) ? without.filter((x) => x !== key) : [...without, key];
      return next.length ? next : ['all'];
    });
  const visible = sections.filter((s) => isAll || tags.includes(s.key));
  const goToGoals = () => router.push('/goals');

  return (
    <View className="gap-3">
      <Pressable onPress={goToGoals} accessibilityRole="button" testID="dash-goals-header" className="flex-row items-center justify-between">
        <Text className="text-secondary text-xl font-bold">{t('Goals')}</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </Pressable>

      <View className="flex-row flex-wrap gap-2">
        {[{ key: 'all', title: 'All' }, ...sections].map((tag) => {
          const active = tags.includes(tag.key);
          return (
            <Pressable
              key={tag.key}
              onPress={() => toggle(tag.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`dash-goals-tag-${tag.key}`}
              className={`rounded-full border px-3 py-1 ${active ? 'border-primary bg-primary/10' : 'border-primary/20'}`}
            >
              <Text className={`text-xs font-semibold ${active ? 'text-primary' : 'text-secondary'}`}>{t(tag.title)}</Text>
            </Pressable>
          );
        })}
      </View>

      {visible.map((section) => (
        <View key={section.key} className="gap-2">
          <Text className="text-description text-sm font-semibold">{t(section.title)}</Text>
          {section.goals.map((g) => (
            <GoalRow key={g.id} goal={g} onPress={goToGoals} />
          ))}
        </View>
      ))}
    </View>
  );
}
