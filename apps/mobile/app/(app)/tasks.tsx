import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getTasks from '@beyou/api/tasks/getTasks';
import getCategories from '@beyou/api/categories/getCategories';
import { deleteTaskOffline } from '../../src/offline/ops/taskOps';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { sortTasks } from '@beyou/state';
import type { task } from '@beyou/types/tasks/taskType';
import TaskCard from '../../src/ui/tasks/TaskCard';
import TaskForm from '../../src/ui/tasks/TaskForm';
import TasksSortSheet from '../../src/ui/tasks/TasksSortSheet';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';

type FormState = { visible: boolean; mode: 'create' | 'edit'; task: task | null };
const CLOSED: FormState = { visible: false, mode: 'create', task: null };

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

  const sortedTasks = useMemo(() => sortTasks(tasks, sortBy), [tasks, sortBy]);

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
            const res = await deleteTaskOffline(target.id, t);
            if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
            else {
              notify.success(res.queued ? t('SavedOffline') : t('deleted successfully'));
              await load();
            }
          },
        },
      ]);
    },
    [t, load],
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <Ionicons name="chevron-back" size={26} color={theme.primary} />
          </Pressable>
          <Text className="text-primary text-2xl font-bold">{t('Tasks')}</Text>
        </View>
        <Pressable
          onPress={() => setForm({ visible: true, mode: 'create', task: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateTask')}
          testID="create-task"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          <Ionicons name="add" size={26} color={theme.background} />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          ListHeaderComponent={tasks.length > 0 ? <View className="mb-1"><TasksSortSheet /></View> : null}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onEdit={(tk) => setForm({ visible: true, mode: 'edit', task: tk })}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center gap-3 px-8">
              <Text className="text-5xl">📝</Text>
              <Text className="text-description text-center text-base">{t('NoTasksYet')}</Text>
              <Pressable
                onPress={() => setForm({ visible: true, mode: 'create', task: null })}
                accessibilityRole="button"
                testID="empty-create-task"
                className="rounded-full bg-primary px-5 py-2.5"
              >
                <Text style={{ color: theme.background }} className="font-semibold">{t('CreateTask')}</Text>
              </Pressable>
            </View>
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
