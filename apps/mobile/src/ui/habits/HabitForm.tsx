import { useEffect } from 'react';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { habitCreateSchema, habitEditSchema } from '@beyou/validation';
import createHabit from '@beyou/api/habits/createHabit';
import editHabit from '@beyou/api/habits/editHabit';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { habit } from '@beyou/types/habit/habitType';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import FormField from '../form/FormField';
import SegmentedControl from '../SegmentedControl';
import FormModal from '../form/FormModal';
import IconPickerField from '../icons/IconPickerField';
import CategorySelector from './CategorySelector';
import { IMPORTANCE_KEYS, DIFFICULTY_KEYS } from './levelLabels';
import { notify } from '../../notify';

type HabitFormValues = {
  name: string;
  description: string;
  motivationalPhrase: string;
  iconId: string;
  importance: number;
  difficulty: number;
  categoriesId: string[];
  experience: number;
};

interface HabitFormProps {
  visible: boolean;
  mode: 'create' | 'edit';
  /** Seeds the form in edit mode. */
  habit?: habit | null;
  categories: category[];
  onClose: () => void;
  /** Called after a successful create/edit so the list can refetch. */
  onSaved: () => void;
  /** Called after a successful CREATE with the new habit's name (for quick-create callers). */
  onCreated?: (name: string) => void;
}

const EXPERIENCE = [
  { value: 0, key: 'Beginner' },
  { value: 1, key: 'Intermediate' },
  { value: 2, key: 'Advanced' },
] as const;

/** [{value:1,label:t(keys[0])}, …] — keys are 1-based scale labels. */
const labelOptions = (keys: readonly string[], t: (k: string) => string) =>
  keys.map((k, i) => ({ value: i + 1, label: t(k) }));

export default function HabitForm({ visible, mode, habit, categories, onClose, onSaved, onCreated }: HabitFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(isEdit ? habitEditSchema(t) : habitCreateSchema(t)) as never,
    defaultValues: {
      name: '',
      description: '',
      motivationalPhrase: '',
      iconId: '',
      importance: 0,
      difficulty: 0,
      categoriesId: [],
      experience: 0,
    },
  });

  // Re-seed whenever the modal opens (or the target habit changes).
  useEffect(() => {
    if (!visible) return;
    reset({
      name: habit?.name ?? '',
      description: habit?.description ?? '',
      motivationalPhrase: habit?.motivationalPhrase ?? '',
      iconId: habit?.iconId ?? '',
      importance: habit?.importance ?? 0,
      difficulty: habit?.dificulty ?? 0,
      categoriesId: habit?.categories?.map((c) => c.id) ?? [],
      experience: 0,
    });
  }, [visible, habit, reset]);

  const onSubmit = async (v: HabitFormValues) => {
    const res = isEdit
      ? await editHabit(
          habit!.id,
          v.name,
          v.description,
          v.motivationalPhrase,
          v.iconId,
          v.importance,
          v.difficulty,
          v.categoriesId,
          t,
        )
      : await createHabit(
          v.name,
          v.description,
          v.motivationalPhrase,
          v.importance,
          v.difficulty,
          v.iconId,
          v.experience,
          v.categoriesId,
          t,
        );

    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    if (res.validation) {
      notify.error(res.validation);
      return;
    }
    notify.success(t(isEdit ? 'edited successfully' : 'created successfully'));
    if (!isEdit) onCreated?.(v.name);
    onSaved();
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={t(isEdit ? 'EditHabit' : 'CreateHabit')}
      submitLabel={t('Save habit')}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      testID="habit-form"
    >
      <FormField label={t('Name')}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              compact
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('HabitNamePlaceholder')}
              error={errors.name?.message}
              accessibilityLabel={t('Name')}
              testID="habit-name"
            />
          )}
        />
      </FormField>

      <FormField label={t('Description')}>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              compact
              multiline
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('HabitDescriptionPlaceholder')}
              error={errors.description?.message}
              accessibilityLabel={t('Description')}
              testID="habit-description"
            />
          )}
        />
      </FormField>

      <FormField label={t('MotivationPhrase')}>
        <Controller
          control={control}
          name="motivationalPhrase"
          render={({ field }) => (
            <Input
              compact
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('MotivationalPhrasePlaceholder')}
              error={errors.motivationalPhrase?.message}
              accessibilityLabel={t('MotivationPhrase')}
              testID="habit-phrase"
            />
          )}
        />
      </FormField>

      <Controller
        control={control}
        name="iconId"
        render={({ field }) => (
          <IconPickerField
            label={t('Icon')}
            value={field.value}
            onChange={field.onChange}
            error={errors.iconId?.message}
            testID="habit-icon"
          />
        )}
      />

      <FormField label={t('Importance')} error={errors.importance?.message}>
        <Controller
          control={control}
          name="importance"
          render={({ field }) => (
            <SegmentedControl
              label={t('Importance')}
              value={field.value}
              onChange={field.onChange}
              options={labelOptions(IMPORTANCE_KEYS, t)}
              testID="habit-importance"
            />
          )}
        />
      </FormField>

      <FormField label={t('Difficulty')} error={errors.difficulty?.message}>
        <Controller
          control={control}
          name="difficulty"
          render={({ field }) => (
            <SegmentedControl
              label={t('Difficulty')}
              value={field.value}
              onChange={field.onChange}
              options={labelOptions(DIFFICULTY_KEYS, t)}
              testID="habit-difficulty"
            />
          )}
        />
      </FormField>

      {!isEdit ? (
        <FormField label={t('YourExperience')} hint={t('HabitExperienceCaption')}>
          <Controller
            control={control}
            name="experience"
            render={({ field }) => (
              <SegmentedControl
                label={t('YourExperience')}
                value={field.value}
                onChange={field.onChange}
                options={EXPERIENCE.map((e) => ({ value: e.value, label: t(e.key) }))}
                testID="habit-experience"
              />
            )}
          />
        </FormField>
      ) : null}

      <FormField label={t('Categories')} error={errors.categoriesId?.message}>
        <Controller
          control={control}
          name="categoriesId"
          render={({ field }) => (
            <CategorySelector categories={categories} value={field.value} onChange={field.onChange} />
          )}
        />
      </FormField>
    </FormModal>
  );
}
