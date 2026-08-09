import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Check, ChevronDown, ChevronUp, Trophy } from 'lucide-react-native';
import { sortGoalsByTime, formatGoalDeadline, type DeadlineShape } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { loadGoalHorizons, saveGoalHorizons } from '../../lib/goalHorizonsStore';
import type { RootState } from '../../store';

type HorizonKey = 'thisWeek' | 'thisMonth' | 'thisYear' | 'beyond';

const HORIZONS: HorizonKey[] = ['thisWeek', 'thisMonth', 'thisYear', 'beyond'];

/** How much of the deadline each horizon shows: near, the day; far, the month. */
const DEADLINE_SHAPE: Record<HorizonKey, DeadlineShape> = {
  thisWeek: 'weekday',
  thisMonth: 'dayMonth',
  thisYear: 'month',
  beyond: 'month',
};

const LABELS: Record<HorizonKey, { title: string; chip: string }> = {
  thisWeek: { title: 'This Week', chip: 'Week' },
  thisMonth: { title: 'This Month', chip: 'Month' },
  thisYear: { title: 'This Year', chip: 'Year' },
  beyond: { title: 'Future Goals', chip: 'Future' },
};

/**
 * "Your goals" on the dashboard: the why behind the day's checks, grouped by
 * horizon. Mirrors the web's `GoalsHorizon` at phone width.
 *
 * The cards are compact on purpose — the point here is seeing what lies ahead at
 * a glance; the detail (stepper, motivation, period) lives on the Goals page,
 * where a tap takes you with the chosen goal already highlighted.
 *
 * The filter is a per-horizon toggle with a count, behind a summary ("month ·
 * year") because the chips do not fit in a phone header. The choice is saved.
 */
export default function DashboardGoals() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const goals = useSelector((s: RootState) => s.goals.goals);

  const [active, setActive] = useState<HorizonKey[]>(['thisWeek', 'thisMonth', 'thisYear']);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loadGoalHorizons().then((stored) => {
      if (!alive || !stored) return;
      const valid = stored.filter((key): key is HorizonKey => HORIZONS.includes(key as HorizonKey));
      if (valid.length > 0) setActive(valid);
    });
    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => sortGoalsByTime(goals ?? []), [goals]);

  const toggle = (key: HorizonKey) => {
    setActive((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      void saveGoalHorizons(next);
      return next;
    });
  };

  // Opens the Goals page with the goal in focus — `expand` is the name the goals
  // screen reads (the web uses `?goal=`; there is no address bar to match here).
  const openGoal = (id: string) => router.push({ pathname: '/goals', params: { expand: id } });

  const visible = HORIZONS.filter((key) => active.includes(key) && grouped[key].length > 0);
  const hasAnyGoal = HORIZONS.some((key) => grouped[key].length > 0);

  if (!hasAnyGoal) return null;

  const activeSummary = HORIZONS.filter((key) => active.includes(key) && grouped[key].length > 0)
    .map((key) => t(LABELS[key].chip).toLowerCase())
    .join(' · ');

  return (
    <View className="rounded-card border border-border bg-surface p-4" testID="goals-horizon">
      <View className="flex-row items-center gap-2">
        <Trophy size={15} color={theme.text3} />
        <Text accessibilityRole="header" className="text-sm font-semibold text-text">
          {t('Goals')}
        </Text>
        <Pressable
          onPress={() => setFilterOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: filterOpen }}
          testID="dash-goals-filter"
          className="ml-auto flex-row items-center gap-1 rounded-full px-2 py-1 active:bg-surface-2"
        >
          <Text className="text-xs text-text-3">{activeSummary || t('Filter')}</Text>
          {/* Icon swapped instead of rotated (see ConfigSection). */}
          {filterOpen ? (
            <ChevronUp size={13} color={theme.text3} />
          ) : (
            <ChevronDown size={13} color={theme.text3} />
          )}
        </Pressable>
      </View>

      {filterOpen ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {HORIZONS.filter((key) => grouped[key].length > 0).map((key) => {
            const isOn = active.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggle(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isOn }}
                testID={`dash-goals-tag-${key}`}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${
                  isOn ? 'border-accent bg-accent-soft' : 'border-border'
                }`}
              >
                {isOn ? <Check size={12} color={theme.accent} /> : null}
                <Text className={`text-xs font-semibold ${isOn ? 'text-accent' : 'text-text-3'}`}>
                  {t(LABELS[key].chip)}
                </Text>
                <Text className="font-mono text-[11px] text-text-3">{grouped[key].length}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {visible.length === 0 ? (
        <Text className="mt-6 text-center text-sm text-text-3">{t('GoalsHorizonAllHidden')}</Text>
      ) : (
        visible.map((key) => (
          <View key={key} className="mt-3 gap-2">
            {grouped[key].map((item: goal) => {
              const target = item.targetValue > 0 ? item.targetValue : 1;
              const percent = Math.min(100, Math.round((item.currentValue / target) * 100));
              const reached = item.currentValue >= item.targetValue;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => openGoal(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  testID={`dash-goal-${item.id}`}
                  className={`rounded-control border p-3 active:bg-surface-2 ${
                    reached ? 'border-success' : 'border-border'
                  }`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                      <BeyouIcon id={item.iconId} size={15} showFallback />
                    </View>
                    <Text
                      className="min-w-0 flex-1 text-[13.5px] font-semibold text-text"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {reached ? (
                      <View className="shrink-0 rounded-full bg-xp-soft px-2 py-0.5">
                        <Text className="font-mono-semibold text-[11px] text-xp">
                          {`+${item.xpReward}`}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <View
                      className={`h-full rounded-full ${reached ? 'bg-success' : 'bg-accent'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </View>

                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="font-mono text-[11px] text-text-3">
                      {`${item.currentValue}/${item.targetValue} ${item.unit ?? ''}`}
                    </Text>
                    <Text className="font-mono text-[11px] text-text-3">
                      {`${t('Until')} ${formatGoalDeadline(item.endDate, i18n.language, DEADLINE_SHAPE[key])}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}
