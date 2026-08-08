import { ChevronLeft, Trophy, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getGoals from '@beyou/api/goals/getGoals';
import getCategories from '@beyou/api/categories/getCategories';
import deleteGoal from '@beyou/api/goals/deleteGoal';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { setViewSort, sortGoals } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import GoalCard from '../../src/ui/goals/GoalCard';
import GoalForm from '../../src/ui/goals/GoalForm';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import DeleteModal from '../../src/ui/DeleteModal';
import EmptyState from '../../src/ui/EmptyState';
import ListToolbar from '../../src/ui/ListToolbar';
import SelectField from '../../src/ui/SelectField';
import { GOAL_SORT_OPTIONS } from '../../src/ui/sortOptions';

type FormState = { visible: boolean; mode: 'create' | 'edit'; goal: goal | null };
const CLOSED: FormState = { visible: false, mode: 'create', goal: null };
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

  const sortedGoals = useMemo(() => sortGoals(goals, sortBy), [goals, sortBy]);

  // Só as categorias que ALGUM item usa: um filtro cheio de opções que não
  // devolvem nada é ruído.
  const categoriesInUse = useMemo(
    () => categories.filter((category) => goals.some((item) => Object.keys(item.categories ?? {}).includes(category.id))),
    [categories, goals],
  );

  const visibleItems = useMemo(() => {
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

  /**
   * O dashboard manda para cá com `expand=<id>`: a lista rola até a meta e a
   * destaca. Sem isso a pessoa cai numa lista e tem de procurar a meta que
   * acabou de tocar.
   */
  useEffect(() => {
    if (!expand || loading) return;
    const index = visibleItems.findIndex((item) => item.id === expand);
    if (index < 0) return;
    const timer = setTimeout(
      () => listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true }),
      250,
    );
    return () => clearTimeout(timer);
  }, [expand, loading, visibleItems]);

  // Excluir usa o modal do sistema: o Alert nativo não carrega tema, nem
  // tipografia, nem o nome do item, e traz a ordem de botões do sistema.
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
            // A lista ainda não mediu esse item (janela de render). Vai até o
            // fim e tenta de novo — sem isto o scroll simplesmente não acontece
            // para metas fora da primeira janela.
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
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              initialExpanded={item.id === expand}
              focused={item.id === expand}
              onEdit={(g) => setForm({ visible: true, mode: 'edit', goal: g })}
              onDelete={setDeleteTarget}
              onChanged={load}
            />
          )}
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
        deletePhrase={t('ConfirmDeleteOfGoalPhrase')}
        name={deleteTarget?.name ?? ''}
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <GoalForm
        visible={form.visible}
        mode={form.mode}
        goal={form.goal}
        categories={categories}
        onClose={() => setForm(CLOSED)}
        onSaved={load}
      />

      {/* Surfaces the level-up / streak celebration when completing a goal awards XP. */}
      <CelebrationOverlay />
    </View>
  );
}
