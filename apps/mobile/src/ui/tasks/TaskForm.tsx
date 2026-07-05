import { useContext, useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { taskFormSchema } from '@beyou/validation';
import { createTaskOffline, editTaskOffline } from '../../offline/ops/taskOps';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { task } from '@beyou/types/tasks/taskType';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import Button from '../Button';
import IconPickerField from '../icons/IconPickerField';
import CategorySelector from '../habits/CategorySelector';
import { IMPORTANCE_KEYS, DIFFICULTY_KEYS } from '../habits/levelLabels';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';

type TaskFormValues = {
  name: string;
  description: string;
  iconId: string;
  importance: number;
  difficulty: number;
  categoriesId: string[];
  oneTimeTask: boolean;
};

interface TaskFormProps {
  visible: boolean;
  mode: 'create' | 'edit';
  /** Seeds the form in edit mode. */
  task?: task | null;
  categories: category[];
  onClose: () => void;
  /** Called after a successful create/edit so the list can refetch. */
  onSaved: () => void;
  /** Called after a successful CREATE with the new task's name (for quick-create callers). */
  onCreated?: (name: string) => void;
}

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

export default function TaskForm({ visible, mode, task, categories, onClose, onSaved, onCreated }: TaskFormProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema(t)) as never,
    defaultValues: { name: '', description: '', iconId: '', importance: 0, difficulty: 0, categoriesId: [], oneTimeTask: false },
  });

  // Re-seed whenever the modal opens (or the target task changes).
  useEffect(() => {
    if (!visible) return;
    reset({
      name: task?.name ?? '',
      description: task?.description ?? '',
      iconId: task?.iconId ?? '',
      importance: task?.importance ?? 0,
      difficulty: task?.difficulty ?? 0,
      categoriesId: task?.categories ? Object.keys(task.categories) : [],
      oneTimeTask: task?.oneTimeTask ?? false,
    });
  }, [visible, task, reset]);

  const onSubmit = async (v: TaskFormValues) => {
    const res = isEdit
      ? await editTaskOffline(task!.id, v.name, v.description, v.iconId, v.importance, v.difficulty, v.categoriesId, v.oneTimeTask, t)
      : await createTaskOffline(v.name, v.description, v.iconId, v.categoriesId, t, v.importance, v.difficulty, v.oneTimeTask);

    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    if (res.validation) {
      notify.error(res.validation);
      return;
    }
    notify.success(res.queued ? t('SavedOffline') : t(isEdit ? 'edited successfully' : 'created successfully'));
    if (!isEdit) onCreated?.(v.name);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-background" style={{ paddingTop: insets?.top ?? 0 }}>
        <View className="flex-row items-center justify-between border-b border-primary/15 px-4 py-3">
          <Pressable onPress={onClose} accessibilityRole="button" testID="task-form-cancel">
            <Text className="text-description text-base">{t('Cancel')}</Text>
          </Pressable>
          <Text className="text-secondary text-lg font-bold">{t(isEdit ? 'EditTask' : 'CreateTask')}</Text>
          <View className="w-12" />
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pt-4" contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Name')}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input value={field.value} onChangeText={field.onChange} placeholder={t('TaskNamePlaceholder')} error={errors.name?.message} accessibilityLabel={t('Name')} testID="task-name" />
              )}
            />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Description')}</Text>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input value={field.value} onChangeText={field.onChange} placeholder={t('TaskDescriptionPlaceholder')} error={errors.description?.message} accessibilityLabel={t('Description')} multiline testID="task-description" />
              )}
            />
          </View>

          <Controller
            control={control}
            name="iconId"
            render={({ field }) => (
              <IconPickerField label={t('Icon')} value={field.value} onChange={field.onChange} error={errors.iconId?.message} testID="task-icon" />
            )}
          />

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Importance')}</Text>
            <Controller
              control={control}
              name="importance"
              render={({ field }) => (
                <Segmented value={field.value} onChange={field.onChange} options={labelOptions(IMPORTANCE_KEYS, t)} testID="task-importance" />
              )}
            />
            {errors.importance?.message ? <Text className="text-error mt-1 text-sm">{errors.importance.message}</Text> : null}
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Difficulty')}</Text>
            <Controller
              control={control}
              name="difficulty"
              render={({ field }) => (
                <Segmented value={field.value} onChange={field.onChange} options={labelOptions(DIFFICULTY_KEYS, t)} testID="task-difficulty" />
              )}
            />
            {errors.difficulty?.message ? <Text className="text-error mt-1 text-sm">{errors.difficulty.message}</Text> : null}
          </View>

          <Controller
            control={control}
            name="categoriesId"
            render={({ field }) => (
              <CategorySelector categories={categories} value={field.value} onChange={field.onChange} error={errors.categoriesId?.message} />
            )}
          />

          <View className="flex-row items-center justify-between rounded-lg border border-primary/30 px-3 py-2">
            <Text className="text-secondary text-base font-semibold">{t('One Time Task')}</Text>
            <Controller
              control={control}
              name="oneTimeTask"
              render={({ field }) => (
                <Switch
                  value={field.value}
                  onValueChange={field.onChange}
                  trackColor={{ true: theme.primary, false: theme.placeholder }}
                  thumbColor={theme.background}
                  testID="task-onetime"
                />
              )}
            />
          </View>

          <View className="mt-2 items-center">
            <Button text={t(isEdit ? 'Edit' : 'Create')} mode="create" submitting={isSubmitting} onPress={handleSubmit(onSubmit)} testID="task-submit" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
