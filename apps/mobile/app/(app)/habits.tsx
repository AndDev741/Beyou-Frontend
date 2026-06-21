import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getHabits from '@beyou/api/habits/getHabits';
import getCategories from '@beyou/api/categories/getCategories';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import type { habit } from '@beyou/types/habit/habitType';
import HabitCard from '../../src/ui/habits/HabitCard';
import HabitForm from '../../src/ui/habits/HabitForm';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';

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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(CLOSED);

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
          data={habits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          renderItem={({ item }) => (
            <HabitCard habit={item} onPress={(h) => setForm({ visible: true, mode: 'edit', habit: h })} />
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
    </View>
  );
}
