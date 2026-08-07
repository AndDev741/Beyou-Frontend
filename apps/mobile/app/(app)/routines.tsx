import { CalendarDays, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
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
import RoutineCard from '../../src/ui/routines/RoutineCard';
import RoutinesOverview from '../../src/ui/routines/RoutinesOverview';
import RoutineBuilder from '../../src/ui/routines/RoutineBuilder';
import ScheduleSheet from '../../src/ui/routines/ScheduleSheet';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import { useRoutinesTutorial } from '../../src/tutorial/hooks/useRoutinesTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
import { useSpotlightSlot } from '../../src/tutorial/TutorialOverlaySlot';
import DeleteModal from '../../src/ui/DeleteModal';
import EmptyState from '../../src/ui/EmptyState';
import { openAgentPanel } from '../../src/ui/agent/agentPanelBus';

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
  const [editTarget, setEditTarget] = useState<Routine | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Routine | null>(null);

  const createRoutineRef = useTutorialTarget('routine-add');
  const scheduleRoutineRef = useTutorialTarget('routine-schedule');
  // hasSection cannot be observed at screen level (it lives in the builder's working copy).
  // The save step's !hasRoutines gate still protects correctness for that step.
  const rt = useRoutinesTutorial();
  // Rendered by the (app) layout so the overlay spans the window — target
  // rects come from measureInWindow, and the bottom bar is outside this screen.
  useSpotlightSlot(rt);

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

  // Excluir usa o modal do sistema: o Alert nativo não carrega tema, nem
  // tipografia, nem o nome da rotina, e traz a ordem de botões do sistema.
  const [deleteTarget, setDeleteTarget] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteRoutine(deleteTarget.id as string, t);
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

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={theme.primary} /></View>
      ) : (
        <FlatList
          data={isPast ? [] : sorted}
          keyExtractor={(item) => item.id ?? item.name}
          contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
          ListHeaderComponent={
            <View className="gap-2">
              <RoutinesOverview
                routines={routines}
                action={
                  !isPast ? (
                    <Pressable
                      ref={createRoutineRef}
                      onPress={() => setBuilder(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('Create routine')}
                      testID="create-routine"
                      className="h-10 w-10 items-center justify-center rounded-full bg-accent active:opacity-80"
                    >
                      <Plus size={22} color={theme.onAccent} />
                    </Pressable>
                  ) : undefined
                }
              />
            </View>
          }
          renderItem={({ item, index }) => (
            <View className="px-4">
              <RoutineCard routine={item} today={today} onSchedule={onSchedule} onEdit={setEditTarget} onDelete={setDeleteTarget} onChanged={load} scheduleRef={index === 0 ? scheduleRoutineRef : undefined} />
            </View>
          )}
          ListEmptyComponent={
            !isPast ? (
              <View className="px-4">
                <EmptyState
                  icon={<CalendarDays size={20} color={theme.accent} />}
                  title={t('0RoutinesTitle')}
                  description={t('0RoutinesDescription')}
                  actionLabel={t('Create routine')}
                  onAction={() => setBuilder(true)}
                  secondaryLabel={t('OrAskTheAssistant')}
                  onSecondary={openAgentPanel}
                  testID="routines-empty"
                />
              </View>
            ) : null
          }
        />
      )}

      <DeleteModal
        visible={deleteTarget !== null}
        deletePhrase={t('ConfirmDeleteOfRoutinePhrase')}
        name={deleteTarget?.name ?? ''}
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <RoutineBuilder visible={builder} mode="create" habits={habits} tasks={tasks} onClose={() => setBuilder(false)} onSaved={load} />
      <RoutineBuilder visible={editTarget !== null} mode="edit" routine={editTarget ?? undefined} habits={habits} tasks={tasks} onClose={() => setEditTarget(null)} onSaved={load} />
      {scheduleTarget ? (
        <ScheduleSheet visible routine={scheduleTarget} onClose={() => setScheduleTarget(null)} onSaved={load} />
      ) : null}
    </View>
  );
}
