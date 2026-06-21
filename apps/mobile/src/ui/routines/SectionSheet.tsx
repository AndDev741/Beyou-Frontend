import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import { uuidv4 } from '../../lib/uuid';
import Input from '../Input';
import Button from '../Button';
import IconPickerField from '../icons/IconPickerField';
import TimeField from './TimeField';

interface SectionSheetProps {
  visible: boolean;
  section: RoutineSection | null;
  onSave: (section: RoutineSection) => void;
  onClose: () => void;
}

export default function SectionSheet({ visible, section, onSave, onClose }: SectionSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [iconId, setIconId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setName(section?.name ?? '');
    setIconId(section?.iconId ?? '');
    setStartTime(section?.startTime ?? '');
    setEndTime(section?.endTime ?? '');
    setError(undefined);
  }, [visible, section]);

  const save = () => {
    if (!name.trim()) { setError(t('RoutineSectionNameRequired')); return; }
    if (!startTime) { setError(t('RoutineSectionStartRequired')); return; }
    onSave({
      id: section?.id || uuidv4(),
      name: name.trim(),
      iconId,
      startTime,
      endTime,
      order: section?.order ?? 0,
      habitGroup: section?.habitGroup ?? [],
      taskGroup: section?.taskGroup ?? [],
      favorite: section?.favorite,
    } as RoutineSection);
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel={t('Cancel')} />
      <View className="absolute bottom-0 left-0 right-0 max-h-[85%] rounded-t-2xl bg-background p-4">
        <Text className="text-secondary mb-3 text-lg font-bold">
          {t(section ? 'Edit Routine Section' : 'Creating Routine Section')}
        </Text>
        <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t('Routine name')}
            accessibilityLabel={t('Routine name')}
            testID="section-name"
          />
          <IconPickerField label={t('Icon')} value={iconId} onChange={setIconId} testID="section-icon" />
          <View className="flex-row gap-3">
            <TimeField label={t('StartTime')} value={startTime} onChange={setStartTime} testID="section-start" />
            <TimeField label={t('EndTime')} value={endTime} onChange={setEndTime} testID="section-end" />
          </View>
          {error ? <Text className="text-error text-sm">{error}</Text> : null}
          <View className="mt-2 flex-row justify-end gap-3">
            <Pressable onPress={onClose} accessibilityRole="button" className="px-4 py-2">
              <Text className="text-description font-semibold">{t('Cancel')}</Text>
            </Pressable>
            <Button text={t('Save')} mode="create" size="small" onPress={save} testID="section-save" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
