import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getRoutines from '@beyou/api/routine/getRoutines';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import deleteRoutine from '@beyou/api/routine/deleteRoutine';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { sortRoutines } from '@beyou/state';
import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import RoutineCard from '../../src/ui/routines/RoutineCard';
import RoutinesOverview from '../../src/ui/routines/RoutinesOverview';
import RoutinesSortSheet from '../../src/ui/routines/RoutinesSortSheet';
import RoutineBuilder from '../../src/ui/routines/RoutineBuilder';
import AiRoutineSheet from '../../src/ui/routines/AiRoutineSheet';
import ScheduleSheet from '../../src/ui/routines/ScheduleSheet';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function RoutinesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const routines = useSelector((s: RootState) => s.routines.routines);
  const habits = useSelector((s: RootState) => s.habits.habits);
  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  const sortBy = useSelector((s: RootState) => s.viewFilters.routines);
  const selectedDate = useSelector((s: RootState) => s.snapshot.selectedDate);
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState<{ name: string; iconId: string; routineSections: RoutineSection[] } | null>(null);
  const [editTarget, setEditTarget] = useState<Routine | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Routine | null>(null);

  const today = todayIso();
  const isPast = !!selectedDate && selectedDate < today;
  const sorted = useMemo(() => sortRoutines(routines, sortBy), [routines, sortBy]);

  const load = useCallback(async () => {
    const [r, h, tk] = await Promise.all([getRoutines(t), getHabits(t), getTasks(t)]);
    if (r.success) dispatch(enterRoutines(r.success as Routine[]));
    if (h.success) dispatch(enterHabits(h.success));
    if (tk.success) dispatch(enterTasks(tk.success));
  }, [dispatch, t]);

  useEffect(() => { let active = true; (async () => { await load(); if (active) setLoading(false); })(); return () => { active = false; }; }, [load]);

  // ScheduleSheet derives conflicts from the routines slice itself — just open it.
  const onSchedule = useCallback((r: Routine) => setScheduleTarget(r), []);

  const onDelete = useCallback((r: Routine) => {
    if (!r.id) return;
    Alert.alert(t('DeleteRoutine'), t('ConfirmDeleteRoutine'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: async () => {
        const res = await deleteRoutine(r.id as string, t);
        if (res.error) { notify.error(getFriendlyErrorMessage(t, res.error)); return; }
        notify.success(t('deleted successfully'));
        await load();
      } },
    ]);
  }, [t, load]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" testID="back-button">
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
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={theme.primary} /></View>
      ) : (
        <FlatList
          data={isPast ? [] : sorted}
          keyExtractor={(item) => item.id ?? item.name}
          contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
          ListHeaderComponent={
            <View className="gap-2">
              <RoutinesOverview routines={routines} />
              {!isPast ? <View className="px-4"><RoutinesSortSheet /></View> : null}
            </View>
          }
          renderItem={({ item }) => (
            <View className="px-4">
              <RoutineCard routine={item} today={today} onSchedule={onSchedule} onEdit={setEditTarget} onDelete={onDelete} onChanged={load} />
            </View>
          )}
          ListEmptyComponent={
            !isPast ? (
              <View className="mt-12 items-center gap-3 px-8">
                <Text className="text-5xl">🗓️</Text>
                <Text className="text-description text-center text-base">{t('NoRoutinesYet')}</Text>
              </View>
            ) : null
          }
        />
      )}

      <RoutineBuilder visible={builder} mode="create" habits={habits} tasks={tasks} onClose={() => setBuilder(false)} onSaved={load} />
      <RoutineBuilder visible={editTarget !== null} mode="edit" routine={editTarget ?? undefined} habits={habits} tasks={tasks} onClose={() => setEditTarget(null)} onSaved={load} />
      <AiRoutineSheet visible={aiOpen} onClose={() => setAiOpen(false)} onReady={(name, routineSections) => { setAiOpen(false); setAiSeed({ name, iconId: '', routineSections }); }} />
      <RoutineBuilder visible={aiSeed !== null} mode="create" routine={aiSeed ?? undefined} habits={habits} tasks={tasks} onClose={() => setAiSeed(null)} onSaved={load} />
      {scheduleTarget ? (
        <ScheduleSheet visible routine={scheduleTarget} onClose={() => setScheduleTarget(null)} onSaved={load} />
      ) : null}
    </View>
  );
}
