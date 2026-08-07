import { ChevronLeft, ListChecks, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getTasks from '@beyou/api/tasks/getTasks';
import getCategories from '@beyou/api/categories/getCategories';
import deleteTask from '@beyou/api/tasks/deleteTask';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { setViewSort, sortTasks } from '@beyou/state';
import type { task } from '@beyou/types/tasks/taskType';
import TaskCard from '../../src/ui/tasks/TaskCard';
import TaskForm from '../../src/ui/tasks/TaskForm';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import EmptyState from '../../src/ui/EmptyState';
import ListToolbar from '../../src/ui/ListToolbar';
import SelectField from '../../src/ui/SelectField';
import { TASK_SORT_OPTIONS } from '../../src/ui/sortOptions';

type FormState = { visible: boolean; mode: 'create' | 'edit'; task: task | null };
const CLOSED: FormState = { visible: false, mode: 'create', task: null };
const ALL_CATEGORIES = 'all';

/**
 * Tasks section screen: self-fetches tasks + categories, lists them as cards, and
 * opens the TaskForm modal for create/edit/delete. Mirrors the Habits screen on the
 * shared @beyou/api + @beyou/state task/category layer (no gamification).
 */
export default function TasksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  const categories = useSelector((s: RootState) => s.categories.categories);
  const sortBy = useSelector((s: RootState) => s.viewFilters.tasks);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(CLOSED);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const sortedTasks = useMemo(() => sortTasks(tasks, sortBy), [tasks, sortBy]);

  // Só as categorias que ALGUM item usa: um filtro cheio de opções que não
  // devolvem nada é ruído.
  const categoriesInUse = useMemo(
    () => categories.filter((category) => tasks.some((item) => Object.keys(item.categories ?? {}).includes(category.id))),
    [categories, tasks],
  );

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedTasks.filter((item) => {
      const matchesTerm =
        !term ||
        item.name?.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || Object.keys(item.categories ?? {}).includes(categoryFilter);
      return matchesTerm && matchesCategory;
    });
  }, [sortedTasks, search, categoryFilter]);

  const isFiltered = search.trim() !== '' || categoryFilter !== ALL_CATEGORIES;
  const sortOptions = useMemo(
    () => TASK_SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.key) })),
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
    const [tk, c] = await Promise.all([getTasks(t), getCategories(t)]);
    if (tk.success) dispatch(enterTasks(tk.success as task[]));
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
    (target: task) => {
      Alert.alert(t('DeleteTask'), t('ConfirmDeleteTask'), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteTask(target.id, t);
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
              {t('YourTasks')}
            </Text>
            <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
              {`${tasks.length} ${t('Tasks')} · ${categoriesInUse.length} ${t('Categories')}`}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setForm({ visible: true, mode: 'create', task: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateTask')}
          testID="create-task"
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
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          ListHeaderComponent={
            tasks.length > 0 ? (
              <ListToolbar
                search={search}
                onSearchChange={setSearch}
                searchLabel={t('TaskSearchPlaceholder')}
                testID="tasks-toolbar"
              >
                <SelectField
                  label={t('Sort by')}
                  value={sortBy}
                  options={sortOptions}
                  onChange={(value) => dispatch(setViewSort({ view: 'tasks', sortBy: value }))}
                  testID="tasks-sort"
                  className="flex-1"
                />
                <SelectField
                  label={t('Categories')}
                  value={categoryFilter}
                  options={categoryOptions}
                  onChange={setCategoryFilter}
                  testID="tasks-category-filter"
                  className="flex-1"
                />
              </ListToolbar>
            ) : null
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onEdit={(tk) => setForm({ visible: true, mode: 'edit', task: tk })}
              onDelete={handleDelete}
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
                testID="tasks-no-results"
              />
            ) : (
              <EmptyState
                icon={<ListChecks size={20} color={theme.accent} />}
                title={t('0TasksTitle')}
                description={t('Start creating amazing tasks to organize your day!')}
                actionLabel={t('CreateTask')}
                onAction={() => setForm({ visible: true, mode: 'create', task: null })}
                testID="empty-create-task"
              />
            )
          }
        />
      )}

      <TaskForm
        visible={form.visible}
        mode={form.mode}
        task={form.task}
        categories={categories}
        onClose={() => setForm(CLOSED)}
        onSaved={load}
      />
    </View>
  );
}
