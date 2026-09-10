import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronRight, CornerLeftUp, Minus, Plus } from 'lucide-react-native';
import { childrenOf, formatGoalDeadline, parseLocalDate } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import BeyouIcon from '../BeyouIcon';
import Chip, { type ChipVariant } from '../Chip';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import Ring from '../Ring';
import XpBar from '../XpBar';
import GoalProgressModal from './GoalProgressModal';
import { useGoalActions } from './useGoalActions';

const STATUS_KEY: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};
const TERM_KEY: Record<string, string> = {
  SHORT_TERM: 'Short Term',
  MEDIUM_TERM: 'Medium Term',
  LONG_TERM: 'Long Term',
};

const ymd = (v: Date | string | null | undefined): string =>
  !v ? '' : typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);

/**
 * Days from today to the goal's deadline, in the person's own calendar: `parseLocalDate`
 * reads the wire date as a local day, and today is truncated the same way, so a goal
 * ending today says "ends today" in every timezone.
 */
export function daysUntil(endDate: Date | string): number | null {
  const end = parseLocalDate(ymd(endDate));
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export interface GoalViewerSlideProps {
  goal: goal;
  allGoals: goal[];
  width: number;
  onChanged: () => void;
  /** Show another goal: a sub-goal from the list below, or the parent from the link above. */
  onJump: (goalId: string) => void;
  /**
   * Whether `onJump` can reach a goal. The screen decides from the deck and the layout:
   * a slide of its own, or a sub-goal that opens on top of its parent's slide. A goal the
   * filters hid is neither, and its row stays put.
   */
  canOpen: (goalId: string) => boolean;
}

/**
 * One goal, the whole screen. Reads from the slice through `goal`, acts through the shared
 * hook. The same component serves a pager slide and the sub-goal opened on top of one, so
 * a sub-goal shows everything its parent does: ring, counter, progress, complete, and its
 * own sub-goals.
 */
export default function GoalViewerSlide({ goal, allGoals, width, onChanged, onJump, canOpen }: GoalViewerSlideProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const { increase, decrease, complete } = useGoalActions();
  const [pending, setPending] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  const isCompleted = goal.status === 'COMPLETED';
  const targetReached = goal.targetValue > 0 && goal.currentValue >= goal.targetValue;
  const fraction = goal.targetValue > 0 ? Math.min(1, goal.currentValue / goal.targetValue) : isCompleted ? 1 : 0;
  const percent = Math.round(fraction * 100);
  const statusVariant: ChipVariant = isCompleted ? 'ok' : goal.status === 'IN_PROGRESS' ? 'accent' : 'neutral';
  const children = childrenOf(allGoals, goal.id).sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
  );
  const parent = goal.parentId ? allGoals.find((g) => g.id === goal.parentId) : undefined;
  const parentOpenable = parent ? canOpen(parent.id) : false;
  const days = daysUntil(goal.endDate);

  const deadlineLine = (() => {
    if (isCompleted) {
      return t('CompletedOn', { date: formatGoalDeadline(goal.completeDate ?? goal.endDate, i18n.language) });
    }
    if (days === null) return `${t('Until')} ${formatGoalDeadline(goal.endDate, i18n.language)}`;
    if (days === 0) return t('DueToday');
    if (days < 0) return t('DaysOverdue', { count: -days });
    return t('DaysLeft', { count: days });
  })();

  const run = async (fn: () => Promise<unknown>, refetch = false) => {
    if (pending) return;
    setPending(true);
    await fn();
    if (refetch) onChanged();
    setPending(false);
  };

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', gap: 14 }}
      testID={`goal-viewer-slide-${goal.id}`}
    >
      {/* The way up sits first: on an opened sub-goal it is the only exit besides the
          hardware back, and the eye looks for it where a screen header would be. */}
      {parent && parentOpenable ? (
        <Pressable
          onPress={() => onJump(parent.id)}
          accessibilityRole="button"
          testID={`goal-viewer-parent-${goal.id}`}
          className="flex-row items-center gap-1.5 self-start rounded-control px-2 py-1.5 active:bg-surface-2"
        >
          <CornerLeftUp size={14} color={theme.text3} />
          <Text className="text-xs text-text-3" numberOfLines={1}>{`${t('BackToParentGoal')}: ${parent.name}`}</Text>
        </Pressable>
      ) : null}

      <IconTile size={72}>
        <BeyouIcon id={goal.iconId} size={36} showFallback />
      </IconTile>
      <Text className="text-center text-2xl font-semibold text-text">{goal.name}</Text>
      {/* The motivation finally gets its place: it is the reason the goal exists, and the
          card only shows it once opened. */}
      {goal.motivation ? (
        <Text className="text-center text-[14px] italic leading-snug text-text-2">{goal.motivation}</Text>
      ) : null}

      <Ring size={180} state="progress" progress={fraction} label={`${percent}%`} title={`${percent}%`} testID={`goal-viewer-ring-${goal.id}`} />
      <Text className="font-mono-semibold text-base text-text-2">
        {`${goal.currentValue}/${goal.targetValue} ${goal.unit ?? ''}`}
      </Text>

      <View className="flex-row flex-wrap justify-center gap-1.5">
        <Chip size="sm" variant={statusVariant}>{t(STATUS_KEY[goal.status] ?? goal.status)}</Chip>
        <Chip size="sm" variant="time">{t(TERM_KEY[goal.term] ?? goal.term)}</Chip>
        {Object.entries(goal.categories ?? {}).map(([id, category]) => (
          <Chip key={id} size="sm" icon={<BeyouIcon id={category.iconId} size={12} />}>
            {category.name}
          </Chip>
        ))}
      </View>

      <View className="flex-row items-center gap-1.5">
        <CalendarDays size={13} color={theme.text3} />
        <Text className="font-mono text-[12px] text-text-3" testID={`goal-viewer-deadline-${goal.id}`}>
          {deadlineLine}
        </Text>
        {!isCompleted && days !== null ? (
          <Text className="font-mono text-[12px] text-text-3">
            {`· ${t('Until')} ${formatGoalDeadline(goal.endDate, i18n.language)}`}
          </Text>
        ) : null}
      </View>

      <View className="w-full flex-row items-center justify-center gap-3 pt-1">
        <IconButton
          label={t('Decrease')}
          onPress={() => run(() => decrease(goal.id))}
          disabled={pending || goal.currentValue === 0}
          className="border border-border"
          testID={`goal-viewer-decrease-${goal.id}`}
        >
          <Minus size={16} color={theme.text2} />
        </IconButton>
        <Pressable
          onPress={() => setProgressOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('UpdateProgress')}
          testID={`goal-viewer-counter-${goal.id}`}
          className="rounded-control border border-border px-3 py-1.5 active:bg-surface-2"
        >
          <Text className="text-xs font-semibold text-text-2">{t('UpdateProgress')}</Text>
        </Pressable>
        {targetReached || isCompleted ? (
          <Pressable
            onPress={() => run(() => complete(goal.id), true)}
            disabled={pending}
            accessibilityRole="button"
            testID={`goal-viewer-complete-${goal.id}`}
            className={`rounded-control px-4 py-1.5 ${isCompleted ? 'border border-border active:bg-surface-2' : 'bg-accent active:opacity-80'}`}
          >
            <Text className="text-xs font-semibold" style={{ color: isCompleted ? theme.accent : theme.onAccent }}>
              {isCompleted ? t('Undo') : t('Complete')}
            </Text>
          </Pressable>
        ) : (
          <IconButton
            label={t('Increase')}
            onPress={() => run(() => increase(goal.id))}
            disabled={pending}
            className="border border-border"
            testID={`goal-viewer-increase-${goal.id}`}
          >
            <Plus size={16} color={theme.text2} />
          </IconButton>
        )}
      </View>

      {children.length > 0 ? (
        <View className="w-full gap-2 rounded-card border border-border bg-surface p-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-text-3">{t('SubGoals')}</Text>
          {children.map((child) => {
            const openable = canOpen(child.id);
            return (
              <Pressable
                key={child.id}
                onPress={() => onJump(child.id)}
                disabled={!openable}
                accessibilityRole="button"
                accessibilityLabel={child.name}
                accessibilityHint={openable ? t('GoalViewerOpenSubGoal') : undefined}
                accessibilityState={{ disabled: !openable }}
                testID={`goal-viewer-child-${child.id}`}
                className={`flex-row items-center gap-2 rounded-control px-1 py-1 active:bg-surface-2 ${openable ? '' : 'opacity-60'}`}
              >
                <IconTile size={24} tone="neutral">
                  <BeyouIcon id={child.iconId} size={13} showFallback />
                </IconTile>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-[12.5px] font-semibold text-text" numberOfLines={1}>{child.name}</Text>
                  <XpBar current={child.currentValue} target={child.targetValue} compact />
                </View>
                <Text className="font-mono text-[11px] text-text-3">{`${child.currentValue}/${child.targetValue}`}</Text>
                {openable ? <ChevronRight size={14} color={theme.text3} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <GoalProgressModal
        visible={progressOpen}
        name={goal.name}
        currentValue={goal.currentValue}
        targetValue={goal.targetValue}
        unit={goal.unit}
        onClose={() => setProgressOpen(false)}
        onApply={(amount, direction) =>
          direction === 'increase'
            ? increase(goal.id, amount).then(() => undefined)
            : decrease(goal.id, amount).then(() => undefined)
        }
        testID={`goal-viewer-progress-${goal.id}`}
      />
    </ScrollView>
  );
}
