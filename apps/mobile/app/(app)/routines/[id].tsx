import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import deleteRoutine from '@beyou/api/routine/deleteRoutine';
import getRoutines from '@beyou/api/routine/getRoutines';
import getSchedules from '@beyou/api/schedule/getSchedules';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import type { Routine } from '@beyou/types/routine/routine';
import type { schedule } from '@beyou/types/schedule/schedule';
import RoutineDetail from '../../../src/ui/routines/RoutineDetail';
import RoutineBuilder from '../../../src/ui/routines/RoutineBuilder';
import ScheduleSheet from '../../../src/ui/routines/ScheduleSheet';
import ScheduleIndicator from '../../../src/ui/routines/ScheduleIndicator';
import { notify } from '../../../src/notify';
import { useBeyouTheme } from '../../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../../src/store';

/**
 * Routine detail screen (Phase 7 PR1): reads the routine from the slice by id,
 * displays RoutineDetail, and provides a delete action via native Alert.
 * Phase 7 PR2: adds Schedule header button + ScheduleIndicator + ScheduleSheet.
 */
export default function RoutineDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = useSelector((s: RootState) => s.routines.routines.find((r) => r.id === id));
  const habits = useSelector((s: RootState) => s.habits.habits);
  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  const [edit, setEdit] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [otherSchedules, setOtherSchedules] = useState<schedule[]>([]);

  const refetchRoutines = useCallback(async () => {
    const r = await getRoutines(t);
    if (r.success) dispatch(enterRoutines(r.success as Routine[]));
  }, [t, dispatch]);

  const openSchedule = useCallback(async () => {
    const res = await getSchedules(t);
    if (res.success) setOtherSchedules(res.success as schedule[]);
    setScheduleOpen(true);
  }, [t]);

  const onDelete = useCallback(() => {
    if (!routine?.id) return;
    Alert.alert(t('DeleteRoutine'), t('ConfirmDeleteRoutine'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          const res = await deleteRoutine(routine.id as string, t);
          if (res.error) {
            notify.error(getFriendlyErrorMessage(t, res.error));
            return;
          }
          notify.success(t('deleted successfully'));
          await refetchRoutines();
          router.back();
        },
      },
    ]);
  }, [routine, t, refetchRoutines, router]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/routines'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <Ionicons name="chevron-back" size={26} color={theme.primary} />
          </Pressable>
          <Text className="text-primary text-2xl font-bold" numberOfLines={1}>
            {routine?.name ?? ''}
          </Text>
        </View>
        {routine ? (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={openSchedule} accessibilityRole="button" testID="schedule-routine">
              <Ionicons name="calendar-outline" size={22} color={theme.primary} />
            </Pressable>
            <Pressable onPress={() => setEdit(true)} accessibilityRole="button" testID="edit-routine">
              <Ionicons name="create-outline" size={22} color={theme.primary} />
            </Pressable>
            <Pressable onPress={onDelete} accessibilityRole="button" testID="delete-routine">
              <Ionicons name="trash-outline" size={22} color={theme.error} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {routine ? <View className="px-4 pb-2"><ScheduleIndicator days={routine.schedule?.days} /></View> : null}
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
        {routine ? <RoutineDetail routine={routine} /> : null}
      </ScrollView>
      <RoutineBuilder
        visible={edit}
        mode="edit"
        routine={routine}
        habits={habits}
        tasks={tasks}
        onClose={() => setEdit(false)}
        onSaved={refetchRoutines}
      />
      {routine ? (
        <ScheduleSheet
          visible={scheduleOpen}
          routine={routine}
          otherSchedules={otherSchedules}
          onClose={() => setScheduleOpen(false)}
          onSaved={refetchRoutines}
        />
      ) : null}
    </View>
  );
}
