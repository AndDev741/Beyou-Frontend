import { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { goalFormSchema } from '@beyou/validation';
import { depthOf, eligibleParents, parseLocalDate } from '@beyou/state';
import createGoal from '@beyou/api/goals/createGoal';
import editGoal from '@beyou/api/goals/editGoal';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { goal } from '@beyou/types/goals/goalType';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import FormField from '../form/FormField';
import FormModal from '../form/FormModal';
import SegmentedControl from '../SegmentedControl';
import SelectField from '../SelectField';
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
  /** '' for a main goal; the select cannot hold null. */
  parentId: string;
};

interface GoalFormProps {
  visible: boolean;
  mode: 'create' | 'edit';
  goal?: goal | null;
  categories: category[];
  /** Every goal of the user: the parent picker is filtered from it (same rule as the server). */
  allGoals?: goal[];
  /**
   * Create mode only: the goal this one is being added under ("Add sub-goal" on a card).
   * Pre-selects the parent and borrows its categories and deadline as a starting point.
   */
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * The two open statuses, the same pair the web offers. COMPLETED is not here:
 * completing belongs to the card's Complete/Undo button, the one path that pays
 * and takes back the XP. Picking it in a form used to leave `complete` false and
 * the goal's own Undo button then completed it instead of undoing.
 */
const STATUS = [
  { value: 'NOT_STARTED', key: 'Not Started' },
  { value: 'IN_PROGRESS', key: 'In Progress' },
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

export default function GoalForm({
  visible,
  mode,
  goal,
  categories,
  allGoals = [],
  defaultParentId,
  onClose,
  onSaved,
}: GoalFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  const defaultParent = useMemo(
    () => (!isEdit && defaultParentId ? allGoals.find((g) => g.id === defaultParentId) : undefined),
    [allGoals, defaultParentId, isEdit],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema(t)) as never,
    defaultValues: {
      title: '', iconId: '', description: '', targetValue: '0', unit: '', currentValue: '0',
      categoriesId: [], motivation: '', startDate: '', endDate: '', status: 'NOT_STARTED', term: 'SHORT_TERM',
      parentId: '',
    },
  });
  const watchedParentId = watch('parentId');
  const watchedEndDate = watch('endDate');

  useEffect(() => {
    if (!visible) return;
    reset({
      title: goal?.name ?? '',
      iconId: goal?.iconId ?? '',
      description: goal?.description ?? '',
      targetValue: String(goal?.targetValue ?? 0),
      unit: goal?.unit ?? '',
      currentValue: String(goal?.currentValue ?? 0),
      // A sub-goal starts from its parent's categories and deadline: that is what it is
      // most likely to share, and both stay editable.
      categoriesId: goal?.categories
        ? Object.keys(goal.categories)
        : defaultParent?.categories
          ? Object.keys(defaultParent.categories)
          : [],
      motivation: goal?.motivation ?? '',
      startDate: ymdFrom(goal?.startDate),
      endDate: ymdFrom(goal?.endDate) || ymdFrom(defaultParent?.endDate),
      status: goal?.status || 'NOT_STARTED',
      term: goal?.term || 'SHORT_TERM',
      parentId: goal?.parentId ?? defaultParent?.id ?? '',
    });
  }, [visible, goal, defaultParent, reset]);

  // Which goals may be the parent: the same rule the server applies (not itself, not a
  // descendant, and the chain still fits in three levels), so the picker never offers
  // something the save would refuse. A second-level goal is marked with an arrow so the
  // list reads as the tree it is.
  const parentOptions = useMemo(() => {
    const eligible = eligibleParents(allGoals, isEdit ? goal?.id : undefined);
    const sorted = [...eligible].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    return [
      { value: '', label: t('ParentGoalNone') },
      ...sorted.map((g) => ({
        value: g.id,
        label: depthOf(allGoals, g.id) > 1 ? `↳ ${g.name}` : g.name,
      })),
    ];
  }, [allGoals, goal?.id, isEdit, t]);

  // A warning, not a block: a sub-goal that outlives its main goal is odd, and the
  // person may know something the rule does not.
  const chosenParent = allGoals.find((g) => g.id === watchedParentId);
  const endsAfterParent = (() => {
    if (!chosenParent?.endDate || !watchedEndDate) return false;
    const parentEnd = parseLocalDate(ymdFrom(chosenParent.endDate));
    const ownEnd = parseLocalDate(watchedEndDate);
    return !!parentEnd && !!ownEnd && ownEnd.getTime() > parentEnd.getTime();
  })();

  // A completed goal shows its status and nothing more: the segment is there so
  // the state is readable, disabled so the only way out stays the card's Undo,
  // which is what gives the XP back.
  const isCompletedGoal = goal?.status === 'COMPLETED';
  const statusOptions = isCompletedGoal
    ? [{ value: 'COMPLETED', label: t('Completed'), disabled: true }]
    : STATUS.map((option) => ({ value: option.value as string, label: t(option.key) }));

  const onSubmit = async (v: GoalFormValues) => {
    const target = Number(v.targetValue) || 0;
    const current = Number(v.currentValue) || 0;
    const res = isEdit
      ? await editGoal(goal!.id, v.title, v.iconId, v.description, target, v.unit, current, goal?.complete ?? false, v.categoriesId, v.motivation, v.startDate, v.endDate, v.status, v.term, t, v.parentId || null)
      : await createGoal(v.title, v.iconId, v.description, target, v.unit, current, v.categoriesId, v.motivation, v.startDate, v.endDate, v.status, v.term, t, v.parentId || null);

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

      {/* Create always starts NOT_STARTED — the first increment is what starts a
          goal. On edit the field is back, because taking a wrong increment back is
          only possible here. */}
      {isEdit ? (
        <FormField
          label={t('Status')}
          error={errors.status?.message}
          hint={isCompletedGoal ? t('GoalStatusLockedByCompletion') : undefined}
        >
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SegmentedControl
                label={t('Status')}
                value={field.value}
                onChange={field.onChange}
                size="sm"
                options={statusOptions}
                testID="goal-status"
              />
            )}
          />
        </FormField>
      ) : null}

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

      {/* Hidden when there is nothing to pick: a select with one option is a question
          with no answer. */}
      {parentOptions.length > 1 ? (
        <FormField label={t('ParentGoal')} hint={endsAfterParent ? undefined : t('ParentGoalHint')}>
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <SelectField
                label={t('ParentGoal')}
                value={field.value}
                options={parentOptions}
                onChange={field.onChange}
                testID="goal-parent"
              />
            )}
          />
          {endsAfterParent ? (
            <Text className="mt-1.5 text-xs text-flame" testID="goal-parent-ends-after">
              {t('SubGoalEndsAfterParent')}
            </Text>
          ) : null}
        </FormField>
      ) : null}

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
