import { useEffect } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { goalFormSchema } from '@beyou/validation';
import createGoal from '@beyou/api/goals/createGoal';
import editGoal from '@beyou/api/goals/editGoal';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { goal } from '@beyou/types/goals/goalType';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import FormField from '../form/FormField';
import FormModal from '../form/FormModal';
import SegmentedControl from '../SegmentedControl';
import IconPickerField from '../icons/IconPickerField';
import CategorySelector from '../habits/CategorySelector';
import DateField, { toYMD } from './DateField';
import { notify } from '../../notify';

type GoalFormValues = {
  title: string;
  iconId: string;
  description: string;
  targetValue: string;
  unit: string;
  currentValue: string;
  categoriesId: string[];
  motivation: string;
  startDate: string;
  endDate: string;
  status: string;
  term: string;
};

interface GoalFormProps {
  visible: boolean;
  mode: 'create' | 'edit';
  goal?: goal | null;
  categories: category[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS = [
  { value: 'NOT_STARTED', key: 'Not Started' },
  { value: 'IN_PROGRESS', key: 'In Progress' },
  { value: 'COMPLETED', key: 'Completed' },
] as const;
const TERM = [
  { value: 'SHORT_TERM', key: 'Short Term' },
  { value: 'MEDIUM_TERM', key: 'Medium Term' },
  { value: 'LONG_TERM', key: 'Long Term' },
] as const;

/** A string-valued segmented control (status / term). */
const numText = (txt: string) => txt.replace(/[^0-9.]/g, '');
const ymdFrom = (v: Date | string | undefined): string =>
  !v ? '' : typeof v === 'string' ? v.slice(0, 10) : toYMD(v);

export default function GoalForm({ visible, mode, goal, categories, onClose, onSaved }: GoalFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema(t)) as never,
    defaultValues: {
      title: '', iconId: '', description: '', targetValue: '0', unit: '', currentValue: '0',
      categoriesId: [], motivation: '', startDate: '', endDate: '', status: 'NOT_STARTED', term: 'SHORT_TERM',
    },
  });

  useEffect(() => {
    if (!visible) return;
    reset({
      title: goal?.name ?? '',
      iconId: goal?.iconId ?? '',
      description: goal?.description ?? '',
      targetValue: String(goal?.targetValue ?? 0),
      unit: goal?.unit ?? '',
      currentValue: String(goal?.currentValue ?? 0),
      categoriesId: goal?.categories ? Object.keys(goal.categories) : [],
      motivation: goal?.motivation ?? '',
      startDate: ymdFrom(goal?.startDate),
      endDate: ymdFrom(goal?.endDate),
      status: goal?.status || 'NOT_STARTED',
      term: goal?.term || 'SHORT_TERM',
    });
  }, [visible, goal, reset]);

  const onSubmit = async (v: GoalFormValues) => {
    const target = Number(v.targetValue) || 0;
    const current = Number(v.currentValue) || 0;
    const res = isEdit
      ? await editGoal(goal!.id, v.title, v.iconId, v.description, target, v.unit, current, goal?.complete ?? false, v.categoriesId, v.motivation, v.startDate, v.endDate, v.status, v.term, t)
      : await createGoal(v.title, v.iconId, v.description, target, v.unit, current, v.categoriesId, v.motivation, v.startDate, v.endDate, v.status, v.term, t);

    if (res.error) { notify.error(getFriendlyErrorMessage(t, res.error)); return; }
    if (res.validation) { notify.error(res.validation); return; }
    notify.success(t(isEdit ? 'edited successfully' : 'created successfully'));
    onSaved();
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={t(isEdit ? 'EditGoal' : 'CreateGoal')}
      submitLabel={t('Save goal')}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      testID="goal-form"
    >
      <FormField label={t('Name')}>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <Input
              compact
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('GoalTitlePlaceholder')}
              error={errors.title?.message}
              accessibilityLabel={t('Name')}
              testID="goal-title"
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
            testID="goal-icon"
          />
        )}
      />

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
              placeholder={t('DescriptionPlaceholder')}
              error={errors.description?.message}
              accessibilityLabel={t('Description')}
              testID="goal-description"
            />
          )}
        />
      </FormField>

      {/* Target, current and unit share the row: they are one sentence ("12 books"),
          and splitting them into three blocks stretched the form for nothing. */}
      <View className="flex-row gap-2">
        <FormField label={t('TargetValue')} className="flex-1">
          <Controller
            control={control}
            name="targetValue"
            render={({ field }) => (
              <Input
                compact
                value={field.value}
                onChangeText={(txt) => field.onChange(numText(txt))}
                keyboardType="numeric"
                error={errors.targetValue?.message}
                accessibilityLabel={t('TargetValue')}
                testID="goal-target"
              />
            )}
          />
        </FormField>
        <FormField label={t('CurrentValue')} className="flex-1">
          <Controller
            control={control}
            name="currentValue"
            render={({ field }) => (
              <Input
                compact
                value={field.value}
                onChangeText={(txt) => field.onChange(numText(txt))}
                keyboardType="numeric"
                error={errors.currentValue?.message}
                accessibilityLabel={t('CurrentValue')}
                testID="goal-current"
              />
            )}
          />
        </FormField>
        <FormField label={t('Unit')} className="flex-1">
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Input
                compact
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('UnitPlaceholder')}
                error={errors.unit?.message}
                accessibilityLabel={t('Unit')}
                testID="goal-unit"
              />
            )}
          />
        </FormField>
      </View>

      <View className="flex-row gap-2">
        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <DateField
              label={t('StartDate')}
              value={field.value}
              onChange={field.onChange}
              error={errors.startDate?.message}
              testID="goal-start"
            />
          )}
        />
        <Controller
          control={control}
          name="endDate"
          render={({ field }) => (
            <DateField
              label={t('EndDate')}
              value={field.value}
              onChange={field.onChange}
              error={errors.endDate?.message}
              testID="goal-end"
            />
          )}
        />
      </View>

      <FormField label={t('Status')} error={errors.status?.message}>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <SegmentedControl
              label={t('Status')}
              value={field.value}
              onChange={field.onChange}
              size="sm"
              options={STATUS.map((option) => ({ value: option.value, label: t(option.key) }))}
              testID="goal-status"
            />
          )}
        />
      </FormField>

      <FormField label={t('Term')} error={errors.term?.message}>
        <Controller
          control={control}
          name="term"
          render={({ field }) => (
            <SegmentedControl
              label={t('Term')}
              value={field.value}
              onChange={field.onChange}
              size="sm"
              options={TERM.map((option) => ({ value: option.value, label: t(option.key) }))}
              testID="goal-term"
            />
          )}
        />
      </FormField>

      <FormField label={t('Motivation')}>
        <Controller
          control={control}
          name="motivation"
          render={({ field }) => (
            <Input
              compact
              multiline
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('GoalMotivationPlaceholder')}
              error={errors.motivation?.message}
              accessibilityLabel={t('Motivation')}
              testID="goal-motivation"
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
    </FormModal>
  );
}
