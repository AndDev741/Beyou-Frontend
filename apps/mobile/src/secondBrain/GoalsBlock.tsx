import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { goalPaceMessage, showsExpectedPace, type GoalPaceTone } from '@beyou/state';
import type { BriefingGoal } from '@beyou/types/briefing/briefing';
import BeyouIcon from '../ui/BeyouIcon';
import IconTile from '../ui/IconTile';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block from './Block';

type GoalsBlockProps = {
  goals: BriefingGoal[];
  /** False when the goals source is off, which is a different empty state from "no goals". */
  enabled: boolean;
};

const PACE_TONE: Record<GoalPaceTone, string> = {
  success: 'text-success',
  danger: 'text-danger',
  flame: 'text-flame',
  muted: 'text-text-2',
};

const clamp = (percent: number) => Math.min(100, Math.max(0, percent));

/**
 * The goals closest to their end date, with the pace verdict the daily briefing gives.
 *
 * It reuses the briefing's sentences on purpose. The same goal read as "behind" in the
 * morning and "on pace" here would be worse than showing neither.
 */
export default function GoalsBlock({ goals, enabled }: GoalsBlockProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(value);

  const daysLabel = (goal: BriefingGoal) => {
    if (goal.daysRemaining < 0) return t('BriefingGoalOverdue', { count: Math.abs(goal.daysRemaining) });
    if (goal.daysRemaining === 0) return t('BriefingGoalDueToday');
    return t('BriefingGoalDaysLeft', { count: goal.daysRemaining });
  };

  return (
    <Block
      title={t('SecondBrainGoalsTitle')}
      testID="second-brain-goals"
      action={
        <Pressable
          onPress={() => router.push('/goals')}
          accessibilityRole="link"
          accessibilityLabel={t('SecondBrainGoalsCta')}
          hitSlop={8}
          className="flex-row items-center gap-1 active:opacity-70"
          testID="second-brain-goals-link"
        >
          <Text className="text-[13px] font-semibold text-accent">{t('SecondBrainGoalsCta')}</Text>
          <ArrowRight size={14} color={theme.accent} />
        </Pressable>
      }
    >
      {!enabled ? (
        <Text className="text-sm text-text-2">{t('SecondBrainSourceOffBlock')}</Text>
      ) : goals.length === 0 ? (
        <Text className="text-sm text-text-2">{t('SecondBrainGoalsEmpty')}</Text>
      ) : (
        <View className="gap-5">
          {goals.map((goal) => {
            const pace = goalPaceMessage(goal, formatNumber);
            return (
              <View key={goal.id} className="flex-row gap-3" testID="second-brain-goal">
                <IconTile size={36}>
                  <BeyouIcon id={goal.iconId} size={18} color={theme.accent} showFallback />
                </IconTile>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="min-w-0 flex-1 text-sm font-semibold text-text" numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <Text className="shrink-0 font-mono text-xs text-text-2">{daysLabel(goal)}</Text>
                  </View>
                  {/* The tick marks where a steady pace would be by today, so the gap between
                      it and the fill is the thing the eye reads. Hidden from screen readers:
                      the pace sentence below says it in words. */}
                  <View className="mt-2.5 h-1.5 w-full rounded-full bg-surface-2">
                    <View
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${clamp(goal.percentComplete)}%` }}
                      testID="second-brain-goal-fill"
                    />
                    {showsExpectedPace(goal) ? (
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        className="rounded-full bg-text-2"
                        style={{
                          position: 'absolute',
                          top: -3,
                          height: 12,
                          width: 2,
                          marginLeft: -1,
                          left: `${clamp(goal.expectedPercent)}%`,
                        }}
                        testID="second-brain-goal-expected"
                      />
                    ) : null}
                  </View>
                  <Text className="mt-2.5 font-mono text-xs text-text-2">
                    {t('BriefingGoalProgress', {
                      current: formatNumber(goal.currentValue),
                      target: formatNumber(goal.targetValue),
                      unit: goal.unit,
                    })}
                  </Text>
                  {pace ? (
                    <Text className={`mt-1 text-[13px] leading-[18px] ${PACE_TONE[pace.tone]}`} testID="second-brain-goal-pace">
                      {t(pace.key, pace.params)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Block>
  );
}
