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
import { getLogger } from '@beyou/api';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { sortHabits } from '@beyou/state';
import { cachedList } from '@beyou/offline';
import type categoryType from '@beyou/types/category/categoryType';
import { getDb, getCacheGeneration } from '../../src/offline/db';
import type { habit } from '@beyou/types/habit/habitType';
import HabitCard from '../../src/ui/habits/HabitCard';
import HabitForm from '../../src/ui/habits/HabitForm';
import HabitsSortSheet from '../../src/ui/habits/HabitsSortSheet';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import { useHabitsTutorial } from '../../src/tutorial/hooks/useHabitsTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
import SpotlightOverlay from '../../src/ui/tutorial/SpotlightOverlay';

type FormState = { visible: boolean; mode: 'create' | 'edit'; habit: habit | null };
const CLOSED: FormState = { visible: false, mode: 'create', habit: null };

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

  const hab = useHabitsTutorial();
  const createRef = useTutorialTarget('habit-create');
  const firstCardRef = useTutorialTarget('habit-first');

  const sortedHabits = useMemo(() => sortHabits(habits, sortBy), [habits, sortBy]);

  const load = useCallback(async () => {
    // ponytail: cache layer unavailable → plain network path (pre-cache behavior)
    const db = await getDb().catch((e) => {
      getLogger().error(e);
      return null;
    });
    if (!db) {
      const [h, c] = await Promise.all([getHabits(t), getCategories(t)]);
      if (Array.isArray(h.success)) dispatch(enterHabits(h.success));
      if (Array.isArray(c.success)) dispatch(enterCategories(c.success));
      return;
    }
    // Captured once per load; a logout mid-fetch bumps the generation so the
    // write-through below is skipped instead of leaking into the next account.
    const gen = getCacheGeneration();
    await Promise.all([
      cachedList<habit>({
        db,
        table: 'habits',
        fetch: () => getHabits(t),
        onRows: (rows) => dispatch(enterHabits(rows)),
        shouldWrite: () => gen === getCacheGeneration(),
      }),
      cachedList<categoryType>({
        db,
        table: 'categories',
        fetch: () => getCategories(t),
        onRows: (rows) => dispatch(enterCategories(rows)),
        shouldWrite: () => gen === getCacheGeneration(),
      }),
    ]);
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
          <Text className="text-primary text-2xl font-bold">{t('Habits')}</Text>
        </View>
        <Pressable
          ref={createRef}
          onPress={() => setForm({ visible: true, mode: 'create', habit: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateHabit')}
          testID="create-habit"
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
          data={sortedHabits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          ListHeaderComponent={habits.length > 0 ? <View className="mb-1"><HabitsSortSheet /></View> : null}
          renderItem={({ item, index }) => (
            <HabitCard
              habit={item}
              onEdit={(h) => setForm({ visible: true, mode: 'edit', habit: h })}
              onDelete={handleDelete}
              viewRef={index === 0 ? firstCardRef : undefined}
            />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center gap-3 px-8">
              <Text className="text-5xl">🌱</Text>
              <Text className="text-description text-center text-base">{t('NoHabitsYet')}</Text>
              <Pressable
                onPress={() => setForm({ visible: true, mode: 'create', habit: null })}
                accessibilityRole="button"
                testID="empty-create-habit"
                className="rounded-full bg-primary px-5 py-2.5"
              >
                <Text style={{ color: theme.background }} className="font-semibold">
                  {t('CreateHabit')}
                </Text>
              </Pressable>
            </View>
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

      {hab.active ? (
        <SpotlightOverlay
          step={hab.steps[hab.stepIndex]}
          stepIndex={hab.stepIndex}
          stepCount={hab.steps.length}
          onNext={hab.next}
          onPrev={hab.prev}
          onSkip={hab.skip}
        />
      ) : null}
    </View>
  );
}
