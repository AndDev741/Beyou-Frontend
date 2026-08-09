import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, ChevronUp, Minus, Pencil, Plus, Trash2 } from 'lucide-react-native';
import type { goal } from '@beyou/types/goals/goalType';
import BeyouIcon from '../BeyouIcon';
import Card from '../Card';
import Chip, { type ChipVariant } from '../Chip';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import XpBar from '../XpBar';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { useGoalActions } from './useGoalActions';
import { formatGoalDeadline } from '@beyou/state';

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
}: GoalCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const { increase, decrease, complete } = useGoalActions();
  const [expanded, setExpanded] = useState(initialExpanded ?? false);
  const [pending, setPending] = useState(false);

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

        {/* Title and badges share what is left: the chips wrap to the
            linha de baixo em vez de espremer o nome da meta a três letras. */}
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text
            className={`min-w-[7rem] flex-1 text-[15px] font-semibold leading-snug ${
              isCompleted ? 'text-text-3' : 'text-text'
            }`}
            numberOfLines={1}
          >
            {goal.name}
          </Text>

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
            <Text className="shrink-0 font-mono-semibold text-xs text-text-2">
              {`${goal.currentValue}/${goal.targetValue} ${goal.unit ?? ''}`}
            </Text>
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
            <Text className="shrink-0 font-mono-semibold text-xs text-text-2">
              {`${goal.currentValue}/${goal.targetValue} ${goal.unit ?? ''}`}
            </Text>
          </>
        )}
      </View>

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
