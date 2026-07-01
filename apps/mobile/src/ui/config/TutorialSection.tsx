import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import { setPhase } from '../../tutorial/tutorialSlice';
import { saveTutorialPhase } from '../../lib/tutorialStore';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';

// White text on the primary button — matches the other config Save buttons
// (ProfileSection/Constance/RoutineSettings use the same local constant).
const ON_PRIMARY = '#FFFFFF';

export default function TutorialSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const isCompleted = useSelector((s: RootState) => s.perfil.isTutorialCompleted);
  const [saving, setSaving] = useState(false);

  const replay = async () => {
    setSaving(true);
    const res = await editUser({ isTutorialCompleted: false });
    setSaving(false);
    if (res.error) { notify.error(getFriendlyErrorMessage(t, res.error)); return; }
    dispatch(tutorialCompletedEnter(false));
    dispatch(setPhase('intro'));
    await saveTutorialPhase('intro');
    // The intro modal renders on the dashboard, so send the user there to start.
    router.replace('/');
  };

  return (
    <View className="gap-2">
      <Text className="text-description text-sm">
        {t('TutorialStatus')}:{' '}
        <Text className={isCompleted ? 'text-success' : 'text-description'}>
          {isCompleted ? t('TutorialStatusCompleted') : t('TutorialStatusPending')}
        </Text>
      </Text>
      <Pressable
        onPress={replay}
        disabled={saving}
        accessibilityRole="button"
        testID="tutorial-replay"
        className={`mt-2 items-center rounded-md bg-primary px-6 py-3 ${saving ? 'opacity-60' : ''}`}
      >
        <Text style={{ color: ON_PRIMARY }} className="text-base font-semibold">
          {saving ? t('Saving...') : t('TutorialRestart')}
        </Text>
      </Pressable>
    </View>
  );
}
