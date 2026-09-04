import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';
import type { goal } from '@beyou/types/goals/goalType';
import BeyouIcon from '../BeyouIcon';
import Card from '../Card';
import Chip, { type ChipVariant } from '../Chip';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import XpBar from '../XpBar';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import GoalProgressModal from './GoalProgressModal';
import { useGoalActions } from './useGoalActions';
import { MAX_GOAL_DEPTH, childrenOf, childrenSummary, formatGoalDeadline, allChildrenComplete } from '@beyou/state';

interface GoalCardProps {
  goal: goal;
  onEdit: (goal: goal) => void;
  onDelete: (goal: goal) => void;
  /** Refetches after completing (the status changes on the server). */
  onChanged: () => void;
  /** Opens already expanded — e.g. arriving from a dashboard goal tap. */
  initialExpanded?: boolean;
  /** Highlights the goal that came from the dashboard, so it is not lost. */
  focused?: boolean;
  /** Dashboard carousel card: no edit, no delete, no chevron. */
  readonly?: boolean;
  /** Direct sub-goals, already in the order they should read (deadline first). */
  subGoals?: goal[];
  /** Every goal of the user, so the sub-goal rows can find their own children. */
  allGoals?: goal[];
  /** 1 for a main goal. Past MAX_GOAL_DEPTH - 1 the card stops offering "Add sub-goal". */
  depth?: number;
  /** Opens the sub-goal rows on mount: a deep link to a sub-goal lands on its parent. */
  initialChildrenOpen?: boolean;
  /** Shown as a small "Sub-goal of …" line above the title. */
  parentName?: string;
  onAddSubGoal?: (parent: goal) => void;
  onOpenViewer?: (goal: goal) => void;
}

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

/**
 * Goal card — mirror of the web `goalBox`.
 *
 * Closed: icon, title, badges, description, categories and the stepper. Once the
 * target is reached the + gives way to "Complete" (that is what pays the XP);
 * once complete, the same button becomes "Undo" and the card KEEPS its whole
 * design, only gaining the XP and done chips up top.
 */
export default function GoalCard({
  goal,
  onEdit,
  onDelete,
  onChanged,
  initialExpanded,
  focused = false,
  readonly = false,
  subGoals = [],
  allGoals = [],
  depth = 1,
  initialChildrenOpen,
  parentName,
  onAddSubGoal,
  onOpenViewer,
}: GoalCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const { increase, decrease, complete } = useGoalActions();
  const [expanded, setExpanded] = useState(initialExpanded ?? false);
  const [childrenOpen, setChildrenOpen] = useState(initialChildrenOpen ?? false);
  const [pending, setPending] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  // The tree is presentation only: the server sent `parentId`, and these three numbers
  // come out of the list both apps already hold. See `@beyou/state` goalTree.
  const hasSubGoals = subGoals.length > 0;
  const summary = childrenSummary(allGoals.length ? allGoals : subGoals.map((c) => ({ ...c, parentId: goal.id })), goal.id);
  const nudgeParent =
    hasSubGoals && !readonly && goal.status !== 'COMPLETED' && allChildrenComplete(allGoals, goal.id);

  const isCompleted = goal.status === 'COMPLETED';
  // "Complete" is what pays the XP, so it only shows once the target is hit;
  // before that the card shows the stepper's +. A targetValue of 0 never
  // "reaches the target".
  const targetReached = goal.targetValue > 0 && goal.currentValue >= goal.targetValue;
  const statusVariant: ChipVariant =
    goal.status === 'COMPLETED' ? 'ok' : goal.status === 'IN_PROGRESS' ? 'accent' : 'neutral';
  const categoryEntries = Object.entries(goal.categories ?? {});
  const termPhrase = t(TERM_KEY[goal.term] ?? goal.term ?? '');
  const statusPhrase = goal.status ? t(STATUS_KEY[goal.status] ?? goal.status) : '';

  const run = async (fn: () => Promise<unknown>, refetch = false) => {
    if (pending) return;
    setPending(true);
    await fn();
    if (refetch) onChanged();
    setPending(false);
  };

  const counterText = `${goal.currentValue}/${goal.targetValue} ${goal.unit ?? ''}`;
  // Read-only cards (the dashboard carousel) keep the plain number: there is
  // nothing to press there.
  const counter = readonly ? (
    <Text className="shrink-0 font-mono-semibold text-xs text-text-2">{counterText}</Text>
  ) : (
    <Pressable
      onPress={() => setProgressOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={`${t('UpdateProgress')}: ${counterText}`}
      testID={`goal-counter-${goal.id}`}
      className="shrink-0 rounded-control px-1 py-1 active:bg-surface-2"
    >
      <Text className="font-mono-semibold text-xs text-text-2">{counterText}</Text>
    </Pressable>
  );

  return (
    <Card
      tone={isCompleted ? 'success' : 'default'}
      selected={focused}
      className={`gap-3 ${focused ? 'border-2' : ''}`}
    >
      <View className="flex-row items-start gap-2.5">
        <IconTile size={34}>
          <BeyouIcon id={goal.iconId} size={18} showFallback />
        </IconTile>

        {/* Title and badges share what is left: the chips wrap to the line below
            instead of squeezing the goal's name down to three letters. */}
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
          {parentName ? (
            <Text className="w-full text-[10.5px] text-text-3" numberOfLines={1} testID={`goal-parent-of-${goal.id}`}>
              {t('SubGoalOf', { name: parentName })}
            </Text>
          ) : null}
          {/* Closed, the name gives way to the chips on one line; open, it is
              shown whole — same as the web card. */}
          <Text
            className={`min-w-[7rem] flex-1 text-[15px] font-semibold leading-snug ${
              isCompleted ? 'text-text-3' : 'text-text'
            }`}
            numberOfLines={expanded ? undefined : 1}
          >
            {goal.name}
          </Text>

          {hasSubGoals ? (
            <Chip size="sm" variant="neutral" testID={`goal-subgoals-${goal.id}`}>
              {t('SubGoalsCount', { completed: summary.completed, total: summary.total })}
            </Chip>
          ) : null}

          {/* XP comes into play when the target lands; a completed goal shows
              — o que rendeu e o selo. */}
          {targetReached || isCompleted ? (
            <Chip size="sm" variant="xp" testID={`goal-xp-${goal.id}`}>
              {`+${goal.xpReward} XP`}
            </Chip>
          ) : null}
          {isCompleted ? (
            <Chip size="sm" variant="ok" testID={`goal-completed-${goal.id}`}>
              {t('Completed')}
            </Chip>
          ) : null}
        </View>

        {!readonly ? (
          <>
            {onOpenViewer ? (
              <IconButton label={t('OpenInViewer')} onPress={() => onOpenViewer(goal)} testID={`goal-open-viewer-${goal.id}`}>
                <Maximize2 size={15} color={theme.text3} />
              </IconButton>
            ) : null}
            {onAddSubGoal && depth < MAX_GOAL_DEPTH ? (
              <IconButton label={t('AddSubGoal')} onPress={() => onAddSubGoal(goal)} testID={`goal-add-sub-${goal.id}`}>
                <Plus size={15} color={theme.text3} />
              </IconButton>
            ) : null}
            <IconButton label={t('Edit')} onPress={() => onEdit(goal)} testID={`goal-edit-${goal.id}`}>
              <Pencil size={15} color={theme.text3} />
            </IconButton>
            <IconButton
              label={t('Delete')}
              tone="danger"
              onPress={() => onDelete(goal)}
              testID={`goal-delete-${goal.id}`}
            >
              <Trash2 size={15} color={theme.text3} />
            </IconButton>
            <IconButton
              label={expanded ? t('Collapse') : t('Expand')}
              onPress={() => setExpanded((open) => !open)}
              testID={`goal-card-${goal.id}`}
            >
              {expanded ? (
                <ChevronUp size={18} color={theme.text3} />
              ) : (
                <ChevronDown size={18} color={theme.text3} />
              )}
            </IconButton>
          </>
        ) : null}
      </View>

      {goal.description ? (
        <Text className="text-[12.5px] leading-snug text-text-3" numberOfLines={2}>
          {goal.description}
        </Text>
      ) : null}

      {categoryEntries.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {categoryEntries.map(([categoryId, category], index) => (
            <Chip
              key={`${categoryId}-${index}`}
              size="sm"
              icon={<BeyouIcon id={category.iconId} size={12} />}
            >
              {category.name}
            </Chip>
          ))}
        </View>
      ) : null}

      {/* Detail only on open: motivation, status and the full period. */}
      {expanded ? (
        <View className="gap-2">
          {goal.motivation ? (
            <Text className="text-[12.5px] italic leading-snug text-text-3">
              {`${t('Motivation')}: ${goal.motivation}`}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-1.5">
            {statusPhrase ? (
              <Chip size="sm" variant={statusVariant}>
                {statusPhrase}
              </Chip>
            ) : null}
            <Chip size="sm" variant="xp">{`+${goal.xpReward} XP`}</Chip>
          </View>
          <View className="flex-row items-center gap-1">
            <CalendarDays size={12} color={theme.text3} />
            <Text className="font-mono text-[11px] text-text-3">
              {`${formatGoalDeadline(goal.startDate, i18n.language)} - ${formatGoalDeadline(goal.endDate, i18n.language)}`}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Stepper: -/+ around the bar, with the value in mono on the right. */}
      <View className="flex-row items-center gap-2">
        <IconButton
          label={t('Decrease')}
          onPress={() => run(() => decrease(goal.id))}
          disabled={pending || goal.currentValue === 0}
          className="border border-border"
          testID={`goal-decrease-${goal.id}`}
        >
          <Minus size={16} color={theme.text2} />
        </IconButton>

        <XpBar className="min-w-0 flex-1" current={goal.currentValue} target={goal.targetValue} compact />

        {targetReached || isCompleted ? (
          <>
            {counter}
            {!readonly ? (
              <Pressable
                onPress={() => run(() => complete(goal.id), true)}
                disabled={pending}
                accessibilityRole="button"
                testID={`goal-complete-${goal.id}`}
                className={`shrink-0 rounded-control px-3 py-1.5 ${
                  isCompleted ? 'active:bg-surface-2' : 'bg-accent active:opacity-80'
                }`}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isCompleted ? theme.accent : theme.onAccent }}
                >
                  {isCompleted ? t('Undo') : t('Complete')}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <IconButton
              label={t('Increase')}
              onPress={() => run(() => increase(goal.id))}
              disabled={pending}
              className="border border-border"
              testID={`goal-increase-${goal.id}`}
            >
              <Plus size={16} color={theme.text2} />
            </IconButton>
            {counter}
          </>
        )}
      </View>

      {/* The sub-goals live under the parent's own bar: a second, thinner bar for the mean
          of their progress, then the rows themselves behind a chevron. The parent's target
          stays the parent's; this is what the children add up to. */}
      {hasSubGoals ? (
        <View className="gap-2" testID={`goal-subgoals-block-${goal.id}`}>
          <Pressable
            onPress={() => setChildrenOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: childrenOpen }}
            accessibilityLabel={t('SubGoals')}
            testID={`goal-subgoals-toggle-${goal.id}`}
            className="flex-row items-center gap-2"
          >
            {childrenOpen ? (
              <ChevronDown size={14} color={theme.text3} />
            ) : (
              <ChevronRight size={14} color={theme.text3} />
            )}
            <Text className="text-[11px] font-semibold text-text-3">{t('SubGoals')}</Text>
            <View className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
              <View className="h-full rounded-full bg-accent/60" style={{ width: `${Math.round(summary.progress * 100)}%` }} />
            </View>
            <Text className="font-mono text-[11px] text-text-3">{`${Math.round(summary.progress * 100)}%`}</Text>
          </Pressable>

          {childrenOpen
            ? subGoals.map((child) => (
                <SubGoalRow
                  key={child.id}
                  child={child}
                  allGoals={allGoals}
                  indent={0}
                  disabled={readonly}
                  onChanged={onChanged}
                />
              ))
            : null}

          {nudgeParent ? (
            <View className="flex-row items-center gap-2 rounded-control bg-accent-soft px-3 py-2">
              <Text className="min-w-0 flex-1 text-[12.5px] text-text-2">{t('AllSubGoalsDone')}</Text>
              <Pressable
                onPress={() => run(() => complete(goal.id), true)}
                disabled={pending}
                accessibilityRole="button"
                testID={`goal-complete-parent-${goal.id}`}
                className="shrink-0 rounded-control bg-accent px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-xs font-semibold" style={{ color: theme.onAccent }}>
                  {t('Complete')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {!readonly ? (
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
          testID={`goal-progress-${goal.id}`}
        />
      ) : null}

      {/* The at-a-glance footer: term on the left, deadline on the right. */}
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-mono text-[11px] text-text-3">{termPhrase}</Text>
        <Text className="font-mono text-[11px] text-text-3">
          {`${t('Until')} ${formatGoalDeadline(goal.endDate, i18n.language)}`}
        </Text>
      </View>
    </Card>
  );
}

interface SubGoalRowProps {
  child: goal;
  allGoals: goal[];
  indent: number;
  disabled?: boolean;
  onChanged: () => void;
}

/**
 * One compact row under a parent: icon, name, the thin bar and a single step. A
 * third-level goal repeats the row indented once under its own parent. The actions are
 * the same hook the card uses, so XP and celebrations behave identically.
 */
function SubGoalRow({ child, allGoals, indent, disabled, onChanged }: SubGoalRowProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { increase, complete } = useGoalActions();
  const [pending, setPending] = useState(false);
  const isDone = child.status === 'COMPLETED';
  const reached = child.targetValue > 0 && child.currentValue >= child.targetValue;
  const grandChildren = childrenOf(allGoals, child.id).sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
  );

  const run = async (fn: () => Promise<unknown>, refetch = false) => {
    if (pending) return;
    setPending(true);
    await fn();
    if (refetch) onChanged();
    setPending(false);
  };

  return (
    <View style={{ paddingLeft: indent * 16 }}>
      <View className="flex-row items-center gap-2" testID={`goal-subgoal-row-${child.id}`}>
        <IconTile size={24} tone="neutral">
          <BeyouIcon id={child.iconId} size={13} showFallback />
        </IconTile>
        <View className="min-w-0 flex-1 gap-1">
          <Text className={`text-[12.5px] font-semibold ${isDone ? 'text-text-3' : 'text-text'}`} numberOfLines={1}>
            {child.name}
          </Text>
          <XpBar current={child.currentValue} target={child.targetValue} compact />
        </View>
        <Text className="font-mono text-[11px] text-text-3">{`${child.currentValue}/${child.targetValue}`}</Text>
        {disabled ? null : isDone ? (
          <Chip size="sm" variant="ok">{t('Completed')}</Chip>
        ) : reached ? (
          <Pressable
            onPress={() => run(() => complete(child.id), true)}
            disabled={pending}
            accessibilityRole="button"
            testID={`goal-subgoal-complete-${child.id}`}
            className="shrink-0 rounded-control bg-accent px-2.5 py-1 active:opacity-80"
          >
            <Text className="text-[11px] font-semibold" style={{ color: theme.onAccent }}>
              {t('Complete')}
            </Text>
          </Pressable>
        ) : (
          <IconButton
            label={t('Increase')}
            onPress={() => run(() => increase(child.id))}
            disabled={pending}
            className="h-7 w-7 border border-border"
            testID={`goal-subgoal-increase-${child.id}`}
          >
            <Plus size={13} color={theme.text2} />
          </IconButton>
        )}
      </View>
      {grandChildren.map((leaf) => (
        <View key={leaf.id} className="mt-2">
          <SubGoalRow child={leaf} allGoals={allGoals} indent={indent + 1} disabled={disabled} onChanged={onChanged} />
        </View>
      ))}
    </View>
  );
}
