import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import generateRoutine from '@beyou/api/ai/generateRoutine';
import materializeRoutine from '@beyou/api/ai/materializeRoutine';
import { sortDraft } from '@beyou/api/ai/sortDraft';
import { materializeToSections, sectionsToDraft } from '@beyou/api/ai/draftMapping';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import getCategories from '@beyou/api/categories/getCategories';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { aiDescriptionSchema } from '@beyou/validation';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import { store } from '../../store';
import Input from '../Input';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface AiRoutineSheetProps {
  visible: boolean;
  /** Current form name/sections — when sections exist the AI refines them (Adjust). */
  currentName: string;
  currentSections: RoutineSection[];
  /** Applies the AI result (newly persisted habits/tasks already created) into the form. */
  onApply: (name: string, sections: RoutineSection[]) => void;
  onClose: () => void;
}

export default function AiRoutineSheet({ visible, currentName, currentSections, onApply, onClose }: AiRoutineSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const hasBase = currentSections.length > 0;

  useEffect(() => { if (visible) { setDescription(''); setError(undefined); } }, [visible]);

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
    const gen = await generateRoutine(
      {
        description,
        previousDraft: hasBase ? sectionsToDraft(currentName, currentSections) : undefined,
        feedback: hasBase ? description : undefined,
        language: i18next.language?.startsWith('pt') ? 'pt' : 'en',
      },
      t,
    );
    if (!gen.success?.draft) { setLoading(false); setError(getFriendlyErrorMessage(t, gen.error)); return; }
    const mat = await materializeRoutine(sortDraft(gen.success.draft), t);
    if (!mat.success) { setLoading(false); setError(getFriendlyErrorMessage(t, mat.error)); return; }
    await refreshSlices();
    setLoading(false);
    onApply(mat.success.name, materializeToSections(mat.success));
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!loading} maxHeight="">
      <Text className="text-secondary mb-2 text-lg font-bold">{t(hasBase ? 'AdjustWithAi' : 'CreateWithAi')}</Text>
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
    </BottomSheet>
  );
}
