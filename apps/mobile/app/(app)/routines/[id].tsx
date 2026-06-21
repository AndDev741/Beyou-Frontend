import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import deleteRoutine from '@beyou/api/routine/deleteRoutine';
import getRoutines from '@beyou/api/routine/getRoutines';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import type { Routine } from '@beyou/types/routine/routine';
import RoutineDetail from '../../../src/ui/routines/RoutineDetail';
import RoutineBuilder from '../../../src/ui/routines/RoutineBuilder';
import { notify } from '../../../src/notify';
import { useBeyouTheme } from '../../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../../src/store';

/**
 * Routine detail screen (Phase 7 PR1): reads the routine from the slice by id,
 * displays RoutineDetail, and provides a delete action via native Alert.
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
          const r = await getRoutines(t);
          if (r.success) dispatch(enterRoutines(r.success as Routine[]));
          router.back();
        },
      },
    ]);
  }, [routine, t, dispatch, router]);

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
            <Pressable onPress={() => setEdit(true)} accessibilityRole="button" testID="edit-routine">
              <Ionicons name="create-outline" size={22} color={theme.primary} />
            </Pressable>
            <Pressable onPress={onDelete} accessibilityRole="button" testID="delete-routine">
              <Ionicons name="trash-outline" size={22} color={theme.error} />
            </Pressable>
          </View>
        ) : null}
      </View>
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
        onSaved={async () => {
          const r = await getRoutines(t);
          if (r.success) dispatch(enterRoutines(r.success as Routine[]));
        }}
      />
    </View>
  );
}
