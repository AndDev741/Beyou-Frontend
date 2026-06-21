import { useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
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
import Button from '../Button';
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
}

const EXPERIENCE = [
  { value: 0, key: 'Beginner' },
  { value: 1, key: 'Intermediate' },
  { value: 2, key: 'Advanced' },
] as const;

function Segmented({
  value,
  onChange,
  options,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  testID?: string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2" testID={testID}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`min-w-[44px] items-center rounded-lg border px-3 py-2 ${
              selected ? 'border-primary bg-primary/10' : 'border-primary/30'
            }`}
          >
            <Text className={`text-sm ${selected ? 'text-primary font-semibold' : 'text-secondary'}`}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** [{value:1,label:t(keys[0])}, …] — keys are 1-based scale labels. */
const labelOptions = (keys: readonly string[], t: (k: string) => string) =>
  keys.map((k, i) => ({ value: i + 1, label: t(k) }));

export default function HabitForm({ visible, mode, habit, categories, onClose, onSaved }: HabitFormProps) {
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
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-primary/15 px-4 py-3">
          <Pressable onPress={onClose} accessibilityRole="button" testID="habit-form-cancel">
            <Text className="text-description text-base">{t('Cancel')}</Text>
          </Pressable>
          <Text className="text-secondary text-lg font-bold">{t(isEdit ? 'EditHabit' : 'CreateHabit')}</Text>
          <View className="w-12" />
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 py-4" keyboardShouldPersistTaps="handled">
          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Name')}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('NamePlaceholder')}
                  error={errors.name?.message}
                  accessibilityLabel={t('Name')}
                  testID="habit-name"
                />
              )}
            />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Description')}</Text>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('HabitDescriptionPlaceholder')}
                  error={errors.description?.message}
                  accessibilityLabel={t('Description')}
                  multiline
                  testID="habit-description"
                />
              )}
            />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('MotivationPhrase')}</Text>
            <Controller
              control={control}
              name="motivationalPhrase"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('MotivationalPhrasePlaceholder')}
                  error={errors.motivationalPhrase?.message}
                  accessibilityLabel={t('MotivationPhrase')}
                  testID="habit-phrase"
                />
              )}
            />
          </View>

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

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Importance')}</Text>
            <Controller
              control={control}
              name="importance"
              render={({ field }) => (
                <Segmented
                  value={field.value}
                  onChange={field.onChange}
                  options={labelOptions(IMPORTANCE_KEYS, t)}
                  testID="habit-importance"
                />
              )}
            />
            {errors.importance?.message ? (
              <Text className="text-error mt-1 text-sm">{errors.importance.message}</Text>
            ) : null}
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Difficulty')}</Text>
            <Controller
              control={control}
              name="difficulty"
              render={({ field }) => (
                <Segmented
                  value={field.value}
                  onChange={field.onChange}
                  options={labelOptions(DIFFICULTY_KEYS, t)}
                  testID="habit-difficulty"
                />
              )}
            />
            {errors.difficulty?.message ? (
              <Text className="text-error mt-1 text-sm">{errors.difficulty.message}</Text>
            ) : null}
          </View>

          {!isEdit ? (
            <View>
              <Text className="text-secondary mb-1 text-base font-semibold">{t('YourExperience')}</Text>
              <Controller
                control={control}
                name="experience"
                render={({ field }) => (
                  <Segmented
                    value={field.value}
                    onChange={field.onChange}
                    options={EXPERIENCE.map((e) => ({ value: e.value, label: t(e.key) }))}
                    testID="habit-experience"
                  />
                )}
              />
            </View>
          ) : null}

          <Controller
            control={control}
            name="categoriesId"
            render={({ field }) => (
              <CategorySelector
                categories={categories}
                value={field.value}
                onChange={field.onChange}
                error={errors.categoriesId?.message}
              />
            )}
          />

          <View className="mt-2 items-center">
            <Button
              text={t(isEdit ? 'Edit' : 'Create')}
              mode="create"
              submitting={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              testID="habit-submit"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
