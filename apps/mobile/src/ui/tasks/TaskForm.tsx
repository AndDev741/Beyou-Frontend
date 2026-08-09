import { useEffect } from 'react';
import { View, Text, Switch } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { taskFormSchema } from '@beyou/validation';
import createTask from '@beyou/api/tasks/createTask';
import editTask from '@beyou/api/tasks/editTask';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { task } from '@beyou/types/tasks/taskType';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import FormField from '../form/FormField';
import FormModal from '../form/FormModal';
import SegmentedControl from '../SegmentedControl';
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

/** [{value:1,label:t(keys[0])}, …] — keys are 1-based scale labels. */
const labelOptions = (keys: readonly string[], t: (k: string) => string) =>
  keys.map((k, i) => ({ value: i + 1, label: t(k) }));

export default function TaskForm({ visible, mode, task, categories, onClose, onSaved, onCreated }: TaskFormProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
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
      ? await editTask(task!.id, v.name, v.description, v.iconId, v.importance, v.difficulty, v.categoriesId, v.oneTimeTask, t)
      : await createTask(v.name, v.description, v.iconId, v.categoriesId, t, v.importance, v.difficulty, v.oneTimeTask);

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
      title={t(isEdit ? 'EditTask' : 'CreateTask')}
      submitLabel={t('Save task')}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      testID="task-form"
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
              placeholder={t('TaskNamePlaceholder')}
              error={errors.name?.message}
              accessibilityLabel={t('Name')}
              testID="task-name"
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
              placeholder={t('TaskDescriptionPlaceholder')}
              error={errors.description?.message}
              accessibilityLabel={t('Description')}
              testID="task-description"
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
            testID="task-icon"
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
              testID="task-importance"
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
              testID="task-difficulty"
            />
          )}
        />
      </FormField>

      <FormField label={t('Categories')} error={errors.categoriesId?.message}>
        <Controller
          control={control}
          name="categoriesId"
          render={({ field }) => (
            <CategorySelector categories={categories} value={field.value} onChange={field.onChange} />
          )}
        />
      </FormField>

      <View className="flex-row items-center justify-between rounded-control border border-border bg-surface px-3 py-2">
        <Text className="text-[13.5px] font-semibold text-text">{t('One Time Task')}</Text>
        <Controller
          control={control}
          name="oneTimeTask"
          render={({ field }) => (
            <Switch
              value={field.value}
              onValueChange={field.onChange}
              trackColor={{ true: theme.accent, false: theme.border }}
              thumbColor={theme.surface}
              testID="task-onetime"
            />
          )}
        />
      </View>
    </FormModal>
  );
}
