import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getRoutines from '@beyou/api/routine/getRoutines';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import type { Routine } from '@beyou/types/routine/routine';
import RoutineCard from '../../src/ui/routines/RoutineCard';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';

/**
 * Routines section screen (Phase 7 PR1): self-fetches routines + habits + tasks,
 * lists them as cards, and navigates to the detail route on press.
 * Delete lives in the detail route. Create (PR2) wires the "+" button to the builder.
 */
export default function RoutinesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const routines = useSelector((s: RootState) => s.routines.routines);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, h, tk] = await Promise.all([getRoutines(t), getHabits(t), getTasks(t)]);
    if (r.success) dispatch(enterRoutines(r.success as Routine[]));
    if (h.success) dispatch(enterHabits(h.success));
    if (tk.success) dispatch(enterTasks(tk.success));
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
          <Text className="text-primary text-2xl font-bold">{t('Routines')}</Text>
        </View>
        {/* PR2 wires this "+" button to the routine builder. For PR1 it is hidden. */}
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(item) => item.id ?? item.name}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          renderItem={({ item }) => (
            <RoutineCard routine={item} onPress={(r) => router.push(`/routines/${r.id}`)} />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center gap-3 px-8">
              <Text className="text-5xl">🗓️</Text>
              <Text className="text-description text-center text-base">{t('NoRoutinesYet')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
