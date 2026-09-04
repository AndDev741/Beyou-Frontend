import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, CornerLeftUp, Minus, Plus, Trophy, X } from 'lucide-react-native';
import getGoals from '@beyou/api/goals/getGoals';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import {
  childrenOf,
  formatGoalDeadline,
  orderGoalsForViewer,
  parseLocalDate,
  setViewSort,
  viewerIndexFor,
} from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import BeyouIcon from '../src/ui/BeyouIcon';
import Chip, { type ChipVariant } from '../src/ui/Chip';
import EmptyState from '../src/ui/EmptyState';
import IconButton from '../src/ui/IconButton';
import IconTile from '../src/ui/IconTile';
import Ring from '../src/ui/Ring';
import SelectField from '../src/ui/SelectField';
import XpBar from '../src/ui/XpBar';
import CelebrationOverlay from '../src/ui/dashboard/CelebrationOverlay';
import GoalProgressModal from '../src/ui/goals/GoalProgressModal';
import { useGoalActions } from '../src/ui/goals/useGoalActions';
import type { AppDispatch, RootState } from '../src/store';

const ALL = 'all';

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
const SORT_OPTIONS = [
  { value: 'status', key: 'SortByStatus' },
  { value: 'category', key: 'SortByCategory' },
  { value: 'end-asc', key: 'SortByDeadline' },
  { value: 'progress-desc', key: 'SortByProgress' },
  { value: 'name-asc', key: 'SortByName' },
] as const;

const ymd = (v: Date | string | null | undefined): string =>
  !v ? '' : typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);

/**
 * Days from today to the goal's deadline, in the person's own calendar: `parseLocalDate`
 * reads the wire date as a local day, and today is truncated the same way, so a goal
 * ending today says "ends today" in every timezone.
 */
function daysUntil(endDate: Date | string): number | null {
  const end = parseLocalDate(ymd(endDate));
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Goals one at a time, full screen.
 *
 * Lives at the ROOT of the router, outside the `(app)` group, for the same reason
 * `focus.tsx` does: the group's layout renders `BottomNav` as a sibling of the screen
 * area, so the only way to get a screen with no bar is to sit outside the group. Still
 * gated by the root `Gate`.
 *
 * The deck's order lives in `viewFilters.goalsViewer`, apart from the goals page's own
 * sort: listing by name and walking by status are different wishes. Ordering itself is
 * `orderGoalsForViewer` from `@beyou/state`, the same function the web uses, so the two
 * never disagree about what "by status" means.
 */
export default function GoalViewerScreen() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { goal: requestedId } = useLocalSearchParams<{ goal?: string }>();
  const { width } = useWindowDimensions();

  const goals = useSelector((s: RootState) => s.goals.goals);
  const sortBy = useSelector((s: RootState) => s.viewFilters.goalsViewer ?? 'status');
  const [status, setStatus] = useState(ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<goal>>(null);

  const load = useCallback(async () => {
    const res = await getGoals(t);
    if (Array.isArray(res.success)) dispatch(enterGoals(res.success as goal[]));
  }, [dispatch, t]);

  // The goals page usually filled the slice already; a cold start straight onto this
  // route has not, and an empty deck with no request would read as "no goals".
  useEffect(() => {
    if (goals.length === 0) void load();
  }, [goals.length, load]);
  useAutoRefresh(load);

  const deck = useMemo(
    () => orderGoalsForViewer(goals, { sortBy, status, categoryId }),
    [goals, sortBy, status, categoryId],
  );

  // The deep link picks the opening slide once; after that the person is in charge.
  const initialIndex = useMemo(() => viewerIndexFor(deck, requestedId), [deck.length === 0, requestedId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    goals.forEach((g) => Object.entries(g.categories ?? {}).forEach(([id, c]) => seen.set(id, c.name)));
    return [
      { value: ALL, label: t('All') },
      ...[...seen.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [goals, t]);
  const statusOptions = useMemo(
    () => [
      { value: ALL, label: t('All') },
      { value: 'NOT_STARTED', label: t('Not Started') },
      { value: 'IN_PROGRESS', label: t('In Progress') },
      { value: 'COMPLETED', label: t('Completed') },
    ],
    [t],
  );
  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) })),
    [t],
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/goals');
  }, [router]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(deck.length - 1, next));
      setIndex(clamped);
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
    },
    [deck.length],
  );

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const current = deck[index];
  const upNext = deck[index + 1];

  return (
    <SafeAreaView className="flex-1 bg-bg" testID="goal-viewer">
      <View className="flex-row items-center gap-3 px-3 pb-1.5 pt-0.5">
        <Text className="min-w-0 flex-1 text-[12.5px] font-semibold uppercase tracking-[1px] text-text-3" numberOfLines={1}>
          {t('GoalViewerTitle')}
        </Text>
        <IconButton label={t('GoalViewerLeave')} onPress={leave} testID="goal-viewer-leave">
          <X size={18} color={theme.text2} />
        </IconButton>
      </View>

      {goals.length > 0 ? (
        <View className="flex-row gap-2 px-3 pb-2">
          <SelectField
            label={t('Sort by')}
            value={sortBy}
            options={sortOptions}
            onChange={(value) => dispatch(setViewSort({ view: 'goalsViewer', sortBy: value }))}
            testID="goal-viewer-sort"
            className="flex-1"
          />
          <SelectField
            label={t('Status')}
            value={status}
            options={statusOptions}
            onChange={setStatus}
            testID="goal-viewer-status"
            className="flex-1"
          />
          {categoryOptions.length > 1 ? (
            <SelectField
              label={t('Categories')}
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
              testID="goal-viewer-category"
              className="flex-1"
            />
          ) : null}
        </View>
      ) : null}

      {deck.length === 0 ? (
        <View className="flex-1 justify-center px-4">
          <EmptyState
            icon={<Trophy size={20} color={theme.accent} />}
            title={t('GoalViewerEmpty')}
            actionLabel={status !== ALL || categoryId !== ALL ? t('ClearFilters') : undefined}
            onAction={() => {
              setStatus(ALL);
              setCategoryId(ALL);
            }}
            variant="ghost"
            testID="goal-viewer-empty"
          />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={deck}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={onMomentumEnd}
            onScrollToIndexFailed={({ index: failed }) => {
              setTimeout(() => listRef.current?.scrollToIndex({ index: failed, animated: false }), 80);
            }}
            renderItem={({ item }) => (
              <Slide
                goal={item}
                deck={deck}
                allGoals={goals}
                width={width}
                onChanged={load}
                onJump={(id) => {
                  const target = deck.findIndex((g) => g.id === id);
                  if (target >= 0) goTo(target);
                }}
              />
            )}
          />

          <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
            <IconButton
              label={t('GoalViewerPrevious')}
              onPress={() => goTo(index - 1)}
              disabled={index === 0}
              className="border border-border"
              testID="goal-viewer-prev"
            >
              <ChevronLeft size={18} color={theme.text2} />
            </IconButton>
            <View className="min-w-0 flex-1 items-center">
              <Text className="font-mono text-[11px] text-text-3" testID="goal-viewer-position">
                {t('GoalViewerPosition', { index: index + 1, total: deck.length })}
              </Text>
              {upNext ? (
                <Text className="text-[11px] text-text-3" numberOfLines={1}>
                  {`${t('GoalViewerUpNext')}: ${upNext.name}`}
                </Text>
              ) : null}
            </View>
            <IconButton
              label={t('GoalViewerNext')}
              onPress={() => goTo(index + 1)}
              disabled={!current || index >= deck.length - 1}
              className="border border-border"
              testID="goal-viewer-next"
            >
              <ChevronRight size={18} color={theme.text2} />
            </IconButton>
          </View>
        </>
      )}

      {/* Completing here pays XP the same way the card does, so the level-up shows here too. */}
      <CelebrationOverlay />
    </SafeAreaView>
  );
}

interface SlideProps {
  goal: goal;
  deck: goal[];
  allGoals: goal[];
  width: number;
  onChanged: () => void;
  onJump: (goalId: string) => void;
}

/** One goal, the whole screen. Reads from the slice through `goal`, acts through the shared hook. */
function Slide({ goal, deck, allGoals, width, onChanged, onJump }: SlideProps) {
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
  const parentInDeck = goal.parentId ? deck.find((g) => g.id === goal.parentId) : undefined;
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
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => onJump(child.id)}
              accessibilityRole="button"
              accessibilityLabel={child.name}
              testID={`goal-viewer-child-${child.id}`}
              className="flex-row items-center gap-2 rounded-control px-1 py-1 active:bg-surface-2"
            >
              <IconTile size={24} tone="neutral">
                <BeyouIcon id={child.iconId} size={13} showFallback />
              </IconTile>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[12.5px] font-semibold text-text" numberOfLines={1}>{child.name}</Text>
                <XpBar current={child.currentValue} target={child.targetValue} compact />
              </View>
              <Text className="font-mono text-[11px] text-text-3">{`${child.currentValue}/${child.targetValue}`}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {parentInDeck ? (
        <Pressable
          onPress={() => onJump(parentInDeck.id)}
          accessibilityRole="button"
          testID={`goal-viewer-parent-${goal.id}`}
          className="flex-row items-center gap-1.5 rounded-control px-3 py-1.5 active:bg-surface-2"
        >
          <CornerLeftUp size={14} color={theme.text3} />
          <Text className="text-xs text-text-3">{`${t('BackToParentGoal')}: ${parentInDeck.name}`}</Text>
        </Pressable>
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
