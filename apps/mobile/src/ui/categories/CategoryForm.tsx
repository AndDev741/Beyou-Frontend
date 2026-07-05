import { useContext, useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { categoryCreateSchema, categoryEditSchema } from '@beyou/validation';
import { createCategoryOffline, editCategoryOffline } from '../../offline/ops/categoryOps';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type category from '@beyou/types/category/categoryType';
import Input from '../Input';
import Button from '../Button';
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
            <Text className={`text-sm ${selected ? 'text-primary font-semibold' : 'text-secondary'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CategoryForm({ visible, mode, category, onCreated, onClose, onSaved }: CategoryFormProps) {
  const { t } = useTranslation();
  const insets = useContext(SafeAreaInsetsContext);
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
      ? await editCategoryOffline(category!.id, v.name, v.description, v.iconId, t)
      : await createCategoryOffline(v.name, v.description, v.experience, v.iconId, t);

    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    if (res.validation) {
      notify.error(res.validation);
      return;
    }
    notify.success(res.queued ? t('SavedOffline') : t(isEdit ? 'edited successfully' : 'created successfully'));
    if (!isEdit) onCreated?.({ name: v.name, iconId: v.iconId });
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-background" style={{ paddingTop: insets?.top ?? 0 }}>
        <View className="flex-row items-center justify-between border-b border-primary/15 px-4 py-3">
          <Pressable onPress={onClose} accessibilityRole="button" testID="category-form-cancel">
            <Text className="text-description text-base">{t('Cancel')}</Text>
          </Pressable>
          <Text className="text-secondary text-lg font-bold">{t(isEdit ? 'EditCategory' : 'CreateCategory')}</Text>
          <View className="w-12" />
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pt-4" contentContainerStyle={{ paddingBottom: (insets?.bottom ?? 0) + 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Name')}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input value={field.value} onChangeText={field.onChange} placeholder={t('CategoryNamePlaceholder')} error={errors.name?.message} accessibilityLabel={t('Name')} testID="category-name" />
              )}
            />
          </View>

          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Description')}</Text>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input value={field.value} onChangeText={field.onChange} placeholder={t('DescriptionPlaceholder')} error={errors.description?.message} accessibilityLabel={t('Description')} multiline testID="category-description" />
              )}
            />
          </View>

          <Controller
            control={control}
            name="iconId"
            render={({ field }) => (
              <IconPickerField label={t('Icon')} value={field.value} onChange={field.onChange} error={errors.iconId?.message} testID="category-icon" />
            )}
          />

          {!isEdit ? (
            <View>
              <Text className="text-secondary mb-1 text-base font-semibold">{t('YourExperience')}</Text>
              <Controller
                control={control}
                name="experience"
                render={({ field }) => (
                  <Segmented value={field.value} onChange={field.onChange} options={EXPERIENCE.map((e) => ({ value: e.value, label: t(e.key) }))} testID="category-experience" />
                )}
              />
            </View>
          ) : null}

          <View className="mt-2 items-center">
            <Button text={t(isEdit ? 'Edit' : 'Create')} mode="create" submitting={isSubmitting} onPress={handleSubmit(onSubmit)} testID="category-submit" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
