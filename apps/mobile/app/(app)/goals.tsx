import { ChevronLeft, Trophy, Plus, Search, Maximize2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';

import getGoals from '@beyou/api/goals/getGoals';
import getCategories from '@beyou/api/categories/getCategories';
import deleteGoal from '@beyou/api/goals/deleteGoal';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { childrenOf, depthOf, rootsForFilter, setViewSort, sortGoals } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import GoalCard from '../../src/ui/goals/GoalCard';
import GoalForm from '../../src/ui/goals/GoalForm';
import AddSubGoalModal from '../../src/ui/goals/AddSubGoalModal';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import DeleteModal from '../../src/ui/DeleteModal';
import EmptyState from '../../src/ui/EmptyState';
import ListToolbar from '../../src/ui/ListToolbar';
import SelectField from '../../src/ui/SelectField';
import SegmentedControl from '../../src/ui/SegmentedControl';
import { GOAL_SORT_OPTIONS } from '../../src/ui/sortOptions';

type FormState = { visible: boolean; mode: 'create' | 'edit'; goal: goal | null; parentId?: string | null };
const CLOSED: FormState = { visible: false, mode: 'create', goal: null };
/** Grouped folds sub-goals under their main goal; flat gives every goal its own card. */
type ViewMode = 'tree' | 'flat';
const ALL_CATEGORIES = 'all';
type StatusFilter = 'all' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Goals section screen: self-fetches goals + categories, lists them as cards with
 * progress + increase/decrease/complete, and opens the GoalForm modal for
 * create/edit/delete. Mirrors the Habits screen on the shared @beyou/api +
 * @beyou/state goal layer.
 */
export default function GoalsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { expand } = useLocalSearchParams<{ expand?: string }>();
  const listRef = useRef<FlatList<goal>>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const goals = useSelector((s: RootState) => s.goals.goals);
  const categories = useSelector((s: RootState) => s.categories.categories);
  const sortBy = useSelector((s: RootState) => s.viewFilters.goals);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(CLOSED);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  // "Add sub-goal" opens an explanation first, not the form: see AddSubGoalModal.
  const [subGoalParent, setSubGoalParent] = useState<goal | null>(null);

  const sortedGoals = useMemo(() => sortGoals(goals, sortBy), [goals, sortBy]);
  const hasAnyTree = useMemo(() => goals.some((g) => Boolean(g.parentId)), [goals]);

  // Only the categories SOME item uses: a filter full of options that return
  // nothing is noise.
  const categoriesInUse = useMemo(
    () => categories.filter((category) => goals.some((item) => Object.keys(item.categories ?? {}).includes(category.id))),
    [categories, goals],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedGoals.filter((item) => {
      const matchesTerm =
        !term ||
        item.name?.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || Object.keys(item.categories ?? {}).includes(categoryFilter);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesTerm && matchesCategory && matchesStatus;
    });
  }, [sortedGoals, search, categoryFilter, statusFilter]);

  // Grouped: the filter runs over every goal, and a main goal whose sub-goal matched
  // stays on the list (dimmed) so the match has somewhere to render. Sorting applies
  // to the roots, in the order `sortedGoals` already gave them.
  const tree = useMemo(() => rootsForFilter(sortedGoals, filteredItems), [sortedGoals, filteredItems]);
  const visibleItems = viewMode === 'tree' ? tree.roots : filteredItems;
  const byId = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const subGoalsOf = useCallback(
    (id: string) =>
      childrenOf(goals, id).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()),
    [goals],
  );
  // A deep link to a sub-goal lands on the card of its root, with the sub-goal rows open.
  const expandRoot = useMemo(() => {
    if (!expand) return undefined;
    let cursor = byId.get(expand);
    const guard = new Set<string>();
    while (cursor?.parentId && byId.has(cursor.parentId) && !guard.has(cursor.id)) {
      guard.add(cursor.id);
      cursor = byId.get(cursor.parentId);
    }
    return cursor?.id;
  }, [byId, expand]);

  const isFiltered =
    search.trim() !== '' || categoryFilter !== ALL_CATEGORIES || statusFilter !== 'all';
  const completedCount = useMemo(() => goals.filter((g) => g.status === 'COMPLETED').length, [goals]);
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('All') },
      { value: 'NOT_STARTED', label: t('Not Started') },
      { value: 'IN_PROGRESS', label: t('In Progress') },
      { value: 'COMPLETED', label: t('Completed') },
    ],
    [t],
  );
  const sortOptions = useMemo(
    () => GOAL_SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.key) })),
    [t],
  );
  const categoryOptions = useMemo(
    () => [
      { value: ALL_CATEGORIES, label: t('All') },
      ...categoriesInUse.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categoriesInUse, t],
  );

  const load = useCallback(async () => {
    const [g, c] = await Promise.all([getGoals(t), getCategories(t)]);
    if (g.success) dispatch(enterGoals(g.success as goal[]));
    if (c.success) dispatch(enterCategories(c.success));
  }, [dispatch, t]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  // Returning to this screen does not remount it: navigation is a Stack and
  // this one stays mounted underneath whatever was pushed on top.
  useAutoRefresh(load);

  /**
   * The dashboard sends you here with `expand=<id>`: the list scrolls to the goal
   * and highlights it. Without that you land in a list and have to hunt for the
   * acabou de tocar.
   */
  useEffect(() => {
    if (!expand || loading) return;
    const index = visibleItems.findIndex((item) => item.id === expand || item.id === expandRoot);
    if (index < 0) return;
    const timer = setTimeout(
      () => listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true }),
      250,
    );
    return () => clearTimeout(timer);
  }, [expand, expandRoot, loading, visibleItems]);

  // Delete uses the system's own modal: the native Alert carries no theme, no
  // typography and no item name, and brings the OS button order.
  const [deleteTarget, setDeleteTarget] = useState<goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteGoal(deleteTarget.id, t);
    setDeleting(false);
    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    setDeleteTarget(null);
    notify.success(t('deleted successfully'));
    await load();
  }, [deleteTarget, load, t]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="min-w-0 flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <ChevronLeft size={24} color={theme.text2} />
          </Pressable>
          <View className="min-w-0">
            <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
              {t('YourGoals')}
            </Text>
            <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
              {completedCount > 0
                ? `${goals.length} ${t('Goals')} · ${completedCount} ${t('Completed')}`
                : `${goals.length} ${t('Goals')}`}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {goals.length > 0 ? (
            <Pressable
              onPress={() => router.push('/goals-view')}
              accessibilityRole="button"
              accessibilityLabel={t('ViewOneByOne')}
              testID="goals-open-viewer"
              className="h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border active:bg-surface-2"
            >
              <Maximize2 size={18} color={theme.text2} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setForm({ visible: true, mode: 'create', goal: null })}
            accessibilityRole="button"
            accessibilityLabel={t('CreateGoal')}
            testID="create-goal"
            className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent active:opacity-80"
          >
            <Plus size={22} color={theme.onAccent} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={visibleItems}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={({ index }) => {
            // The list has not measured that item yet (render window). Go to the
            // end and try again — without this the scroll simply never happens for
            // goals outside the first window.
            listRef.current?.scrollToEnd({ animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.5 }), 80);
          }}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 40, gap: 12 }}
          ListHeaderComponent={
            goals.length > 0 ? (
              <ListToolbar
                search={search}
                onSearchChange={setSearch}
                searchLabel={t('GoalSearchPlaceholder')}
                testID="goals-toolbar"
                footer={
                  // Only once there is a tree to fold: with no sub-goals the two modes
                  // draw the same list, and the control would be a question with one answer.
                  hasAnyTree ? (
                    <SegmentedControl<ViewMode>
                      label={t('SubGoals')}
                      value={viewMode}
                      onChange={setViewMode}
                      size="sm"
                      options={[
                        { value: 'tree', label: t('ShowAsTree') },
                        { value: 'flat', label: t('ShowAsFlatList') },
                      ]}
                      testID="goals-view-mode"
                    />
                  ) : null
                }
              >
                <SelectField
                  label={t('Status')}
                  value={statusFilter}
                  options={statusOptions}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                  testID="goals-status-filter"
                  className="flex-1"
                />
                <SelectField
                  label={t('Sort by')}
                  value={sortBy}
                  options={sortOptions}
                  onChange={(value) => dispatch(setViewSort({ view: 'goals', sortBy: value }))}
                  testID="goals-sort"
                  className="flex-1"
                />
                <SelectField
                  label={t('Categories')}
                  value={categoryFilter}
                  options={categoryOptions}
                  onChange={setCategoryFilter}
                  testID="goals-category-filter"
                  className="flex-1"
                />
              </ListToolbar>
            ) : null
          }
          renderItem={({ item }) => {
            const isTree = viewMode === 'tree';
            const parent = item.parentId ? byId.get(item.parentId) : undefined;
            return (
              // Dimmed when it is only here because a sub-goal matched the filter.
              <View className={isTree && tree.viaDescendantOnly.has(item.id) ? 'opacity-60' : ''}>
                <GoalCard
                  goal={item}
                  initialExpanded={item.id === expand}
                  initialChildrenOpen={!!expand && item.id === expandRoot && expand !== item.id}
                  focused={item.id === expand}
                  subGoals={isTree ? subGoalsOf(item.id) : []}
                  allGoals={goals}
                  depth={depthOf(goals, item.id)}
                  parentName={!isTree ? parent?.name : undefined}
                  onEdit={(g) => setForm({ visible: true, mode: 'edit', goal: g })}
                  onDelete={setDeleteTarget}
                  onChanged={load}
                  onAddSubGoal={setSubGoalParent}
                  onOpenViewer={(g) => router.push({ pathname: '/goals-view', params: { goal: g.id } })}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            isFiltered ? (
              <EmptyState
                icon={<Search size={20} color={theme.accent} />}
                title={t('NoResultsTitle')}
                description={t('NoResultsDescription')}
                actionLabel={t('ClearFilters')}
                onAction={() => {
                  setSearch('');
                  setCategoryFilter(ALL_CATEGORIES);
                  setStatusFilter('all');
                }}
                variant="ghost"
                testID="goals-no-results"
              />
            ) : (
              <EmptyState
                icon={<Trophy size={20} color={theme.accent} />}
                title={t('0GoalsTitle')}
                description={t('Start creating amazing goals to track your progress!')}
                actionLabel={t('CreateGoal')}
                onAction={() => setForm({ visible: true, mode: 'create', goal: null })}
                testID="empty-create-goal"
              />
            )
          }
        />
      )}

      <DeleteModal
        visible={deleteTarget !== null}
        deletePhrase={
          deleteTarget && childrenOf(goals, deleteTarget.id).length > 0
            ? `${t('ConfirmDeleteOfGoalPhrase')} ${t('SubGoalsBecomeTopLevel', { count: childrenOf(goals, deleteTarget.id).length })}`
            : t('ConfirmDeleteOfGoalPhrase')
        }
        name={deleteTarget?.name ?? ''}
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <AddSubGoalModal
        parent={subGoalParent}
        allGoals={goals}
        onClose={() => setSubGoalParent(null)}
        onCreateNew={(parent) => {
          setSubGoalParent(null);
          setForm({ visible: true, mode: 'create', goal: null, parentId: parent.id });
        }}
        onMoved={load}
      />

      <GoalForm
        visible={form.visible}
        mode={form.mode}
        goal={form.goal}
        categories={categories}
        allGoals={goals}
        defaultParentId={form.parentId}
        onClose={() => setForm(CLOSED)}
        onSaved={load}
      />

      {/* Surfaces the level-up / streak celebration when completing a goal awards XP. */}
      <CelebrationOverlay />
    </View>
  );
}
