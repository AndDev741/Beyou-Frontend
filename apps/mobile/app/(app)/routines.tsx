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
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import RoutineCard from '../../src/ui/routines/RoutineCard';
import RoutineBuilder from '../../src/ui/routines/RoutineBuilder';
import AiRoutineSheet from '../../src/ui/routines/AiRoutineSheet';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';

/**
 * Routines section screen: self-fetches routines + habits + tasks,
 * lists them as cards, and navigates to the detail route on press.
 * Delete lives in the detail route. The "+" button opens the RoutineBuilder to create a new routine.
 */
export default function RoutinesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const routines = useSelector((s: RootState) => s.routines.routines);
  const habits = useSelector((s: RootState) => s.habits.habits);
  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState<{ name: string; iconId: string; routineSections: RoutineSection[] } | null>(null);

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
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => setAiOpen(true)} accessibilityRole="button" accessibilityLabel={t('CreateWithAi')} testID="ai-routine" className="h-10 w-10 items-center justify-center rounded-full border border-primary">
            <Ionicons name="sparkles-outline" size={22} color={theme.primary} />
          </Pressable>
          <Pressable onPress={() => setBuilder(true)} accessibilityRole="button" accessibilityLabel={t('Create routine')} testID="create-routine" className="h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Ionicons name="add" size={26} color={theme.background} />
          </Pressable>
        </View>
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
      <RoutineBuilder visible={builder} mode="create" habits={habits} tasks={tasks} onClose={() => setBuilder(false)} onSaved={load} />
      <AiRoutineSheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        onReady={(name, routineSections) => {
          setAiOpen(false);
          setAiSeed({ name, iconId: '', routineSections });
        }}
      />
      <RoutineBuilder
        visible={aiSeed !== null}
        mode="create"
        routine={aiSeed ?? undefined}
        habits={habits}
        tasks={tasks}
        onClose={() => setAiSeed(null)}
        onSaved={load}
      />
    </View>
  );
}
