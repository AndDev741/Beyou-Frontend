import { useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import generateRoutine from '@beyou/api/ai/generateRoutine';
import materializeRoutine from '@beyou/api/ai/materializeRoutine';
import { sortDraft } from '@beyou/api/ai/sortDraft';
import { materializeToSections } from '@beyou/api/ai/draftMapping';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import getCategories from '@beyou/api/categories/getCategories';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { aiDescriptionSchema } from '@beyou/validation';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { RoutineDraft } from '@beyou/types/ai/routineDraft';
import type { MaterializeResponse } from '@beyou/types/ai/materialize';
import { store } from '../../store';
import Input from '../Input';
import Button from '../Button';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface AiRoutineSheetProps {
  visible: boolean;
  onClose: () => void;
  onReady: (name: string, sections: RoutineSection[]) => void;
}

export default function AiRoutineSheet({ visible, onClose, onReady }: AiRoutineSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const refreshSlices = async () => {
    const [h, tk, c] = await Promise.all([getHabits(t), getTasks(t), getCategories(t)]);
    if (h.success) store.dispatch(enterHabits(h.success));
    if (tk.success) store.dispatch(enterTasks(tk.success));
    if (c.success) store.dispatch(enterCategories(c.success));
  };

  const generate = async () => {
    const parsed = aiDescriptionSchema(t).safeParse({ description });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; }
    setError(undefined);
    setLoading(true);
    const gen = await generateRoutine({ description, language: i18next.language || 'en' }, t);
    if (!gen.success) { setLoading(false); notify.error(getFriendlyErrorMessage(t, gen.error)); return; }
    // gen.success is { draft: RoutineDraft } (from generateRoutine wrapping response.data)
    // When the HTTP layer returns { data: { success: { draft } } } the inner .success.draft holds the draft
    const genSuccess = gen.success as { draft?: RoutineDraft; success?: { draft: RoutineDraft } };
    const draft = genSuccess.draft ?? genSuccess.success?.draft;
    if (!draft) { setLoading(false); notify.error(t('UnexpectedError')); return; }
    const mat = await materializeRoutine(sortDraft(draft), t);
    if (!mat.success) { setLoading(false); notify.error(getFriendlyErrorMessage(t, mat.error)); return; }
    // mat.success is MaterializeResponse (from materializeRoutine wrapping response.data)
    // When the HTTP layer returns { data: { success: materialized } } the inner .success holds the response
    const matResult = ((mat.success as unknown as { success?: MaterializeResponse }).success ?? mat.success) as MaterializeResponse;
    await refreshSlices();
    setLoading(false);
    onReady(matResult.name, materializeToSections(matResult));
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={loading ? undefined : onClose} accessibilityLabel={t('Cancel')} />
      <View className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background p-4">
        <Text className="text-secondary mb-2 text-lg font-bold">{t('CreateWithAi')}</Text>
        <Text className="text-description mb-3 text-sm">{t('DescribeYourRoutine')}</Text>
        {loading ? (
          <View className="items-center gap-3 py-8">
            <ActivityIndicator color={theme.primary} />
            <Text className="text-description text-sm">{t('GeneratingRoutine')}</Text>
          </View>
        ) : (
          <>
            <Input value={description} onChangeText={setDescription} placeholder={t('DescribeRoutinePlaceholder')} error={error} multiline accessibilityLabel={t('DescribeYourRoutine')} testID="ai-description" />
            <View className="mt-3 items-center">
              <Button text={t('GenerateRoutine')} mode="create" onPress={generate} testID="ai-generate" />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
