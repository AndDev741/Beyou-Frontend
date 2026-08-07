import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { categoryCreateSchema, categoryEditSchema } from '@beyou/validation';
import createCategory from '@beyou/api/categories/createCategory';
import editCategory from '@beyou/api/categories/editCategory';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import FormField from '../form/FormField';
import FormModal from '../form/FormModal';
import SegmentedControl from '../SegmentedControl';
import IconPickerField from '../icons/IconPickerField';
import { notify } from '../../notify';

type CategoryFormValues = {
  name: string;
  description: string;
  iconId: string;
  experience: number;
};

interface CategoryFormProps {
  visible: boolean;
  mode: 'create' | 'edit';
  /** Seeds the form in edit mode. */
  category?: category | null;
  /** Called after a successful CREATE with the submitted values (for inline-create callers). */
  onCreated?: (values: { name: string; iconId: string }) => void;
  onClose: () => void;
  /** Called after a successful create/edit so the list can refetch. */
  onSaved: () => void;
}

const EXPERIENCE = [
  { value: 0, key: 'Beginner' },
  { value: 1, key: 'Intermediate' },
  { value: 2, key: 'Advanced' },
] as const;

export default function CategoryForm({ visible, mode, category, onCreated, onClose, onSaved }: CategoryFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(isEdit ? categoryEditSchema(t) : categoryCreateSchema(t)) as never,
    defaultValues: { name: '', description: '', iconId: '', experience: 0 },
  });

  // Re-seed whenever the modal opens (or the target category changes).
  useEffect(() => {
    if (!visible) return;
    reset({
      name: category?.name ?? '',
      description: category?.description ?? '',
      iconId: category?.iconId ?? '',
      experience: 0,
    });
  }, [visible, category, reset]);

  const onSubmit = async (v: CategoryFormValues) => {
    const res = isEdit
      ? await editCategory(category!.id, v.name, v.description, v.iconId, t)
      : await createCategory(v.name, v.description, v.experience, v.iconId, t);

    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    if (res.validation) {
      notify.error(res.validation);
      return;
    }
    notify.success(t(isEdit ? 'edited successfully' : 'created successfully'));
    if (!isEdit) onCreated?.({ name: v.name, iconId: v.iconId });
    onSaved();
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={t(isEdit ? 'EditCategory' : 'CreateCategory')}
      submitLabel={t('Save category')}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      testID="category-form"
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
              placeholder={t('CategoryNamePlaceholder')}
              error={errors.name?.message}
              accessibilityLabel={t('Name')}
              testID="category-name"
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
              placeholder={t('DescriptionPlaceholder')}
              error={errors.description?.message}
              accessibilityLabel={t('Description')}
              testID="category-description"
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
            testID="category-icon"
          />
        )}
      />

      {!isEdit ? (
        <FormField label={t('YourExperience')} hint={t('CategoryExperienceCaption')}>
          <Controller
            control={control}
            name="experience"
            render={({ field }) => (
              <SegmentedControl
                label={t('YourExperience')}
                value={field.value}
                onChange={field.onChange}
                options={EXPERIENCE.map((e) => ({ value: e.value, label: t(e.key) }))}
                testID="category-experience"
              />
            )}
          />
        </FormField>
      ) : null}
    </FormModal>
  );
}
