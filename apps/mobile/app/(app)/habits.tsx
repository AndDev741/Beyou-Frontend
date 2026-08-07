import { ChevronLeft, Plus, Repeat, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getHabits from '@beyou/api/habits/getHabits';
import getCategories from '@beyou/api/categories/getCategories';
import deleteHabit from '@beyou/api/habits/deleteHabit';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { setViewSort, sortHabits } from '@beyou/state';
import type { habit } from '@beyou/types/habit/habitType';
import HabitCard from '../../src/ui/habits/HabitCard';
import HabitForm from '../../src/ui/habits/HabitForm';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import { useHabitsTutorial } from '../../src/tutorial/hooks/useHabitsTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
import { useSpotlightSlot } from '../../src/tutorial/TutorialOverlaySlot';
import EmptyState from '../../src/ui/EmptyState';
import ListToolbar from '../../src/ui/ListToolbar';
import SelectField from '../../src/ui/SelectField';
import { HABIT_SORT_OPTIONS } from '../../src/ui/sortOptions';

type FormState = { visible: boolean; mode: 'create' | 'edit'; habit: habit | null };
const CLOSED: FormState = { visible: false, mode: 'create', habit: null };
const ALL_CATEGORIES = 'all';

/**
 * Habits section screen (Phase 6): self-fetches habits + categories, lists them as
 * cards, and opens the HabitForm modal for create/edit/delete. Reuses the shared
 * @beyou/api + @beyou/state habit/category layer end-to-end.
 */
export default function HabitsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const habits = useSelector((s: RootState) => s.habits.habits);
  const categories = useSelector((s: RootState) => s.categories.categories);
  const sortBy = useSelector((s: RootState) => s.viewFilters.habits);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(CLOSED);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const hab = useHabitsTutorial();
  // Rendered by the (app) layout so the overlay spans the window — target
  // rects come from measureInWindow, and the bottom bar is outside this screen.
  useSpotlightSlot(hab);
  const createRef = useTutorialTarget('habit-create');
  const firstCardRef = useTutorialTarget('habit-first');

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

  // Só as categorias que ALGUM hábito usa: um filtro cheio de opções que não
  // devolvem nada é ruído.
  const categoriesInUse = useMemo(
    () => categories.filter((category) => habits.some((h) => h.categories?.some((c) => c.id === category.id))),
    [categories, habits],
  );

  const visibleHabits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedHabits.filter((h) => {
      const matchesTerm =
        !term ||
        h.name?.toLowerCase().includes(term) ||
        (h.description ?? '').toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || h.categories?.some((c) => c.id === categoryFilter);
      return matchesTerm && matchesCategory;
    });
  }, [sortedHabits, search, categoryFilter]);

  const isFiltered = search.trim() !== '' || categoryFilter !== ALL_CATEGORIES;
  const sortOptions = useMemo(
    () => HABIT_SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.key) })),
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
    const [h, c] = await Promise.all([getHabits(t), getCategories(t)]);
    if (h.success) dispatch(enterHabits(h.success as habit[]));
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

  const handleDelete = useCallback(
    (target: habit) => {
      Alert.alert(t('DeleteHabit'), t('ConfirmDeleteHabit'), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteHabit(target.id, t);
            if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
            else {
              notify.success(t('deleted successfully'));
              await load();
            }
          },
        },
      ]);
    },
    [t, load],
  );

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
              {t('YourHabits')}
            </Text>
            <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
              {`${habits.length} ${t('Habits')} · ${categoriesInUse.length} ${t('Categories')}`}
            </Text>
          </View>
        </View>
        <Pressable
          ref={createRef}
          onPress={() => setForm({ visible: true, mode: 'create', habit: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateHabit')}
          testID="create-habit"
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
          data={visibleHabits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          ListHeaderComponent={
            habits.length > 0 ? (
              <ListToolbar
                search={search}
                onSearchChange={setSearch}
                searchLabel={t('HabitSearchPlaceholder')}
                testID="habits-toolbar"
              >
                <SelectField
                  label={t('Sort by')}
                  value={sortBy}
                  options={sortOptions}
                  onChange={(value) => dispatch(setViewSort({ view: 'habits', sortBy: value }))}
                  testID="habits-sort"
                  className="flex-1"
                />
                <SelectField
                  label={t('Categories')}
                  value={categoryFilter}
                  options={categoryOptions}
                  onChange={setCategoryFilter}
                  testID="habits-category-filter"
                  className="flex-1"
                />
              </ListToolbar>
            ) : null
          }
          renderItem={({ item, index }) => (
            <HabitCard
              habit={item}
              onEdit={(h) => setForm({ visible: true, mode: 'edit', habit: h })}
              onDelete={handleDelete}
              viewRef={index === 0 ? firstCardRef : undefined}
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
                }}
                variant="ghost"
                testID="habits-no-results"
              />
            ) : (
              <EmptyState
                icon={<Repeat size={20} color={theme.accent} />}
                title={t('0HabitsTitle')}
                description={t('0HabitsDescription')}
                actionLabel={t('CreateHabit')}
                onAction={() => setForm({ visible: true, mode: 'create', habit: null })}
                testID="empty-create-habit"
              />
            )
          }
        />
      )}

      <HabitForm
        visible={form.visible}
        mode={form.mode}
        habit={form.habit}
        categories={categories}
        onClose={() => setForm(CLOSED)}
        onSaved={load}
      />
    </View>
  );
}
