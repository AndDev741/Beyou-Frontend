import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, BackHandler, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react-native';
import getGoals from '@beyou/api/goals/getGoals';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import {
  GOAL_VIEWER_LAYOUTS,
  goalViewerLayoutFrom,
  orderGoalsForViewer,
  setViewSort,
  viewerSlideFor,
} from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import EmptyState from '../src/ui/EmptyState';
import IconButton from '../src/ui/IconButton';
import SelectField from '../src/ui/SelectField';
import CelebrationOverlay from '../src/ui/dashboard/CelebrationOverlay';
import GoalViewerSlide from '../src/ui/goals/GoalViewerSlide';
import type { AppDispatch, RootState } from '../src/store';

const ALL = 'all';

const SORT_OPTIONS = [
  { value: 'status', key: 'SortByStatus' },
  { value: 'category', key: 'SortByCategory' },
  { value: 'end-asc', key: 'SortByDeadline' },
  { value: 'progress-desc', key: 'SortByProgress' },
  { value: 'name-asc', key: 'SortByName' },
] as const;
const LAYOUT_KEY: Record<string, string> = {
  grouped: 'GoalViewerLayoutGrouped',
  list: 'GoalViewerLayoutList',
};

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
 *
 * The deck's shape is `viewFilters.goalsViewerLayout`. Grouped walks the main goals and a
 * sub-goal opens on top of its parent's slide (`openId`), so the pager never moves while
 * the person reads a sub-goal, and the way out is the parent link or the hardware back.
 * List gives every goal a slide, the way the viewer worked before the choice existed.
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
  const layout = goalViewerLayoutFrom(useSelector((s: RootState) => s.viewFilters.goalsViewerLayout));
  const [status, setStatus] = useState(ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [index, setIndex] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
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
    () => orderGoalsForViewer(goals, { sortBy, status, categoryId, layout }),
    [goals, sortBy, status, categoryId, layout],
  );

  // The deep link picks the opening slide once; after that the person is in charge. In the
  // grouped layout a deep link to a sub-goal lands on its parent's slide with the sub-goal open.
  const initialSlide = useMemo(() => viewerSlideFor(deck, goals, requestedId), [deck.length === 0, requestedId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIndex(initialSlide.index);
    setOpenId(initialSlide.openId);
  }, [initialSlide]);

  const scrollTo = useCallback((target: number) => {
    listRef.current?.scrollToIndex({ index: target, animated: true });
  }, []);

  // An open sub-goal that becomes a slide (the layout switched to list) is walked to
  // instead; one that stopped existing (deleted under us) is let go.
  useEffect(() => {
    if (!openId) return;
    const own = deck.findIndex((g) => g.id === openId);
    if (own >= 0) {
      setOpenId(null);
      setIndex(own);
      scrollTo(own);
    } else if (!goals.some((g) => g.id === openId)) {
      setOpenId(null);
    }
  }, [deck, goals, openId, scrollTo]);

  // A goal is reachable when it is a slide or when it opens on top of one.
  const canOpen = useCallback(
    (goalId: string) => {
      const slide = viewerSlideFor(deck, goals, goalId);
      return deck[slide.index]?.id === goalId || slide.openId !== null;
    },
    [deck, goals],
  );

  // One level up from the open sub-goal: its parent when that one is also only openable
  // (a grandchild closing to its parent), otherwise back to the slide underneath.
  const closeOpen = useCallback(() => {
    setOpenId((current) => {
      const parentId = current ? goals.find((g) => g.id === current)?.parentId : null;
      if (parentId && !deck.some((g) => g.id === parentId) && canOpen(parentId)) return parentId;
      return null;
    });
  }, [canOpen, deck, goals]);

  // Android's back button leaves a sub-goal before it leaves the screen. Only registered
  // while something is open so the route's own back behaviour stays untouched otherwise.
  useEffect(() => {
    if (!openId) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeOpen();
      return true;
    });
    return () => subscription.remove();
  }, [openId, closeOpen]);

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
  const layoutOptions = useMemo(
    () => GOAL_VIEWER_LAYOUTS.map((value) => ({ value, label: t(LAYOUT_KEY[value]) })),
    [t],
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/goals');
  }, [router]);

  // Walking the deck closes whatever sub-goal was open: the arrows always show a slide.
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(deck.length - 1, next));
      setOpenId(null);
      setIndex(clamped);
      scrollTo(clamped);
    },
    [deck.length, scrollTo],
  );

  const jumpTo = useCallback(
    (goalId: string) => {
      const own = deck.findIndex((g) => g.id === goalId);
      if (own >= 0) {
        goTo(own);
        return;
      }
      const slide = viewerSlideFor(deck, goals, goalId);
      if (!slide.openId) return;
      setOpenId(slide.openId);
      if (slide.index !== index) {
        setIndex(slide.index);
        scrollTo(slide.index);
      }
    },
    [deck, goals, goTo, index, scrollTo],
  );

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const current = deck[index];
  const upNext = deck[index + 1];
  const opened = openId ? goals.find((g) => g.id === openId) : undefined;

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
        <View className="flex-row flex-wrap gap-2 px-3 pb-2">
          <SelectField
            label={t('Sort by')}
            value={sortBy}
            options={sortOptions}
            onChange={(value) => dispatch(setViewSort({ view: 'goalsViewer', sortBy: value }))}
            testID="goal-viewer-sort"
            className="flex-1"
          />
          <SelectField
            label={t('GoalViewerLayout')}
            value={layout}
            options={layoutOptions}
            onChange={(value) => dispatch(setViewSort({ view: 'goalsViewerLayout', sortBy: value }))}
            testID="goal-viewer-layout"
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
          <View className="flex-1">
            <FlatList
              ref={listRef}
              data={deck}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              initialScrollIndex={initialSlide.index}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={onMomentumEnd}
              onScrollToIndexFailed={({ index: failed }) => {
                setTimeout(() => listRef.current?.scrollToIndex({ index: failed, animated: false }), 80);
              }}
              renderItem={({ item }) => (
                <GoalViewerSlide
                  goal={item}
                  allGoals={goals}
                  width={width}
                  onChanged={load}
                  onJump={jumpTo}
                  canOpen={canOpen}
                />
              )}
            />
            {/* The open sub-goal covers the pager rather than replacing it, so the pager
                keeps its scroll position and the parent's slide is right there on close.
                Keyed by id so a deeper drill-in starts with fresh local state. */}
            {opened ? (
              <View className="absolute inset-0 bg-bg" testID="goal-viewer-open">
                <GoalViewerSlide
                  key={opened.id}
                  goal={opened}
                  allGoals={goals}
                  width={width}
                  onChanged={load}
                  onJump={jumpTo}
                  canOpen={canOpen}
                />
              </View>
            ) : null}
          </View>

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
