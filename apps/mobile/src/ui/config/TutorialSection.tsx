import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import Button from '../Button';
import { setPhase } from '../../tutorial/tutorialSlice';
import { saveTutorialPhase } from '../../lib/tutorialStore';
import { notify } from '../../notify';
import type { RootState, AppDispatch } from '../../store';

export default function TutorialSection() {
  const { t } = useTranslation();
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
    notify.success(t('TutorialRestarted'));
  };

  return (
    <View className="gap-2">
      <Text className="text-description text-sm">{t('TutorialDescription')}</Text>
      <Text className="text-description text-sm">
        {t('TutorialStatus')}:{' '}
        <Text className={isCompleted ? 'text-success' : 'text-description'}>
          {isCompleted ? t('TutorialStatusCompleted') : t('TutorialStatusPending')}
        </Text>
      </Text>
      <Button text={saving ? t('Saving...') : t('TutorialRestart')} mode="create" size="small" submitting={saving} onPress={replay} testID="tutorial-replay" />
    </View>
  );
}
