import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getGoals from '@beyou/api/goals/getGoals';
import getCategories from '@beyou/api/categories/getCategories';
import { deleteGoalOffline } from '../../src/offline/ops/goalOps';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { sortGoals } from '@beyou/state';
import type { goal } from '@beyou/types/goals/goalType';
import GoalCard from '../../src/ui/goals/GoalCard';
import GoalForm from '../../src/ui/goals/GoalForm';
import GoalsSortSheet from '../../src/ui/goals/GoalsSortSheet';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';

type FormState = { visible: boolean; mode: 'create' | 'edit'; goal: goal | null };
const CLOSED: FormState = { visible: false, mode: 'create', goal: null };

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
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const goals = useSelector((s: RootState) => s.goals.goals);
  const categories = useSelector((s: RootState) => s.categories.categories);
  const sortBy = useSelector((s: RootState) => s.viewFilters.goals);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(CLOSED);

  const sortedGoals = useMemo(() => sortGoals(goals, sortBy), [goals, sortBy]);

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

  const handleDelete = useCallback(
    (target: goal) => {
      Alert.alert(t('DeleteGoal'), t('ConfirmDeleteOfGoalPhrase'), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteGoalOffline(target.id, t);
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
          <Text className="text-primary text-2xl font-bold">{t('Goals')}</Text>
        </View>
        <Pressable
          onPress={() => setForm({ visible: true, mode: 'create', goal: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateGoal')}
          testID="create-goal"
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
          data={sortedGoals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          ListHeaderComponent={goals.length > 0 ? <View className="mb-1"><GoalsSortSheet /></View> : null}
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              initialExpanded={item.id === expand}
              onEdit={(g) => setForm({ visible: true, mode: 'edit', goal: g })}
              onDelete={handleDelete}
              onChanged={load}
            />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center gap-3 px-8">
              <Text className="text-5xl">🎯</Text>
              <Text className="text-description text-center text-base">{t('NoGoalsYet')}</Text>
              <Pressable
                onPress={() => setForm({ visible: true, mode: 'create', goal: null })}
                accessibilityRole="button"
                testID="empty-create-goal"
                className="rounded-full bg-primary px-5 py-2.5"
              >
                <Text style={{ color: theme.background }} className="font-semibold">{t('CreateGoal')}</Text>
              </Pressable>
            </View>
          }
        />
      )}

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
