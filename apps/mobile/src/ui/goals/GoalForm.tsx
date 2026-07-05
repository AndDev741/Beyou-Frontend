import { useContext, useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { goalFormSchema } from '@beyou/validation';
import { createGoalOffline, editGoalOffline } from '../../offline/ops/goalOps';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { goal } from '@beyou/types/goals/goalType';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import Button from '../Button';
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
function Segmented({
  value,
  onChange,
  options,
  testID,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
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
            className={`items-center rounded-lg border px-3 py-2 ${selected ? 'border-primary bg-primary/10' : 'border-primary/30'}`}
          >
            <Text className={`text-sm ${selected ? 'text-primary font-semibold' : 'text-secondary'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const numText = (txt: string) => txt.replace(/[^0-9.]/g, '');
const ymdFrom = (v: Date | string | undefined): string =>
  !v ? '' : typeof v === 'string' ? v.slice(0, 10) : toYMD(v);

export default function GoalForm({ visible, mode, goal, categories, onClose, onSaved }: GoalFormProps) {
  const { t } = useTranslation();
  const insets = useContext(SafeAreaInsetsContext);
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
      ? await editGoalOffline(goal!.id, v.title, v.iconId, v.description, target, v.unit, current, goal?.complete ?? false, v.categoriesId, v.motivation, v.startDate, v.endDate, v.status, v.term, t)
      : await createGoalOffline(v.title, v.iconId, v.description, target, v.unit, current, v.categoriesId, v.motivation, v.startDate, v.endDate, v.status, v.term, t);

    if (res.error) { notify.error(getFriendlyErrorMessage(t, res.error)); return; }
    if (res.validation) { notify.error(res.validation); return; }
    notify.success(res.queued ? t('SavedOffline') : t(isEdit ? 'edited successfully' : 'created successfully'));
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-background" style={{ paddingTop: insets?.top ?? 0 }}>
        <View className="flex-row items-center justify-between border-b border-primary/15 px-4 py-3">
          <Pressable onPress={onClose} accessibilityRole="button" testID="goal-form-cancel">
            <Text className="text-description text-base">{t('Cancel')}</Text>
          </Pressable>
          <Text className="text-secondary text-lg font-bold">{t(isEdit ? 'EditGoal' : 'CreateGoal')}</Text>
          <View className="w-12" />
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pt-4" contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Name')}</Text>
            <Controller control={control} name="title" render={({ field }) => (
              <Input value={field.value} onChangeText={field.onChange} placeholder={t('GoalTitlePlaceholder')} error={errors.title?.message} accessibilityLabel={t('Name')} testID="goal-title" />
            )} />
          </View>

          <Controller control={control} name="iconId" render={({ field }) => (
            <IconPickerField label={t('Icon')} value={field.value} onChange={field.onChange} error={errors.iconId?.message} testID="goal-icon" />
          )} />

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Description')}</Text>
            <Controller control={control} name="description" render={({ field }) => (
              <Input value={field.value} onChangeText={field.onChange} placeholder={t('DescriptionPlaceholder')} error={errors.description?.message} accessibilityLabel={t('Description')} multiline testID="goal-description" />
            )} />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-secondary mb-1 text-base font-semibold">{t('TargetValue')}</Text>
              <Controller control={control} name="targetValue" render={({ field }) => (
                <Input value={field.value} onChangeText={(txt) => field.onChange(numText(txt))} keyboardType="numeric" error={errors.targetValue?.message} accessibilityLabel={t('TargetValue')} testID="goal-target" />
              )} />
            </View>
            <View className="flex-1">
              <Text className="text-secondary mb-1 text-base font-semibold">{t('CurrentValue')}</Text>
              <Controller control={control} name="currentValue" render={({ field }) => (
                <Input value={field.value} onChangeText={(txt) => field.onChange(numText(txt))} keyboardType="numeric" error={errors.currentValue?.message} accessibilityLabel={t('CurrentValue')} testID="goal-current" />
              )} />
            </View>
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Unit')}</Text>
            <Controller control={control} name="unit" render={({ field }) => (
              <Input value={field.value} onChangeText={field.onChange} placeholder={t('UnitPlaceholder')} error={errors.unit?.message} accessibilityLabel={t('Unit')} testID="goal-unit" />
            )} />
          </View>

          <View className="flex-row gap-3">
            <Controller control={control} name="startDate" render={({ field }) => (
              <DateField label={t('StartDate')} value={field.value} onChange={field.onChange} error={errors.startDate?.message} testID="goal-start" />
            )} />
            <Controller control={control} name="endDate" render={({ field }) => (
              <DateField label={t('EndDate')} value={field.value} onChange={field.onChange} error={errors.endDate?.message} testID="goal-end" />
            )} />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Status')}</Text>
            <Controller control={control} name="status" render={({ field }) => (
              <Segmented value={field.value} onChange={field.onChange} options={STATUS.map((s) => ({ value: s.value, label: t(s.key) }))} testID="goal-status" />
            )} />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Term')}</Text>
            <Controller control={control} name="term" render={({ field }) => (
              <Segmented value={field.value} onChange={field.onChange} options={TERM.map((s) => ({ value: s.value, label: t(s.key) }))} testID="goal-term" />
            )} />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Motivation')}</Text>
            <Controller control={control} name="motivation" render={({ field }) => (
              <Input value={field.value} onChangeText={field.onChange} placeholder={t('GoalMotivationPlaceholder')} error={errors.motivation?.message} accessibilityLabel={t('Motivation')} multiline testID="goal-motivation" />
            )} />
          </View>

          <Controller control={control} name="categoriesId" render={({ field }) => (
            <CategorySelector categories={categories} value={field.value} onChange={field.onChange} error={errors.categoriesId?.message} />
          )} />

          <View className="mt-2 items-center">
            <Button text={t(isEdit ? 'Edit' : 'Create')} mode="create" submitting={isSubmitting} onPress={handleSubmit(onSubmit)} testID="goal-submit" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
