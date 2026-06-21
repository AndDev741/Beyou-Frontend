import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { routineFormSchema } from '@beyou/validation';
import createRoutine from '@beyou/api/routine/createRoutine';
import editRoutine from '@beyou/api/routine/editRoutine';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import Input from '../Input';
import Button from '../Button';
import IconPickerField from '../icons/IconPickerField';
import SectionSheet from './SectionSheet';
import ItemPickerSheet from './ItemPickerSheet';
import SectionCard from './SectionCard';
import { notify } from '../../notify';

interface RoutineBuilderProps {
  visible: boolean;
  mode: 'create' | 'edit';
  routine?: Routine | null;
  habits: habit[];
  tasks: task[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyRoutine = (): Routine => ({ name: '', iconId: '', routineSections: [] });

export default function RoutineBuilder({ visible, mode, routine, habits, tasks, onClose, onSaved }: RoutineBuilderProps) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  const [working, setWorking] = useState<Routine>(emptyRoutine());
  const [sectionSheet, setSectionSheet] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [itemSheet, setItemSheet] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Deep clone so edits never mutate the slice.
    setWorking(routine ? JSON.parse(JSON.stringify(routine)) : emptyRoutine());
  }, [visible, routine]);

  const setSections = (routineSections: RoutineSection[]) =>
    setWorking((w) => ({ ...w, routineSections: routineSections.map((s, i) => ({ ...s, order: i })) }));

  const upsertSection = (section: RoutineSection) => {
    const list = [...(working.routineSections ?? [])];
    if (sectionSheet.index === null) list.push(section);
    else list[sectionSheet.index] = section;
    setSections(list);
  };

  const move = (index: number, dir: -1 | 1) => {
    const list = [...working.routineSections];
    const to = index + dir;
    if (to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    setSections(list);
  };

  const save = async () => {
    const parsed = routineFormSchema(t).safeParse({
      routineName: working.name,
      routineSections: working.routineSections,
    });
    if (!parsed.success) { notify.error(parsed.error.issues[0]?.message ?? t('UnexpectedError')); return; }
    setSubmitting(true);
    const res = isEdit ? await editRoutine(working, t) : await createRoutine(working, t);
    setSubmitting(false);
    if (res.error) { notify.error(getFriendlyErrorMessage(t, res.error)); return; }
    if (res.validation) { notify.error(res.validation); return; }
    notify.success(t(isEdit ? 'edited successfully' : 'created successfully'));
    onSaved();
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-primary/15 px-4 py-3">
          <Pressable onPress={onClose} accessibilityRole="button" testID="routine-form-cancel"><Text className="text-description text-base">{t('Cancel')}</Text></Pressable>
          <Text className="text-secondary text-lg font-bold">{t(isEdit ? 'Edit Routine' : 'Create routine')}</Text>
          <View className="w-12" />
        </View>
        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 py-4" keyboardShouldPersistTaps="handled">
          <View>
            <Text className="text-secondary mb-1 text-base font-semibold">{t('Routine name')}</Text>
            <Input value={working.name} onChangeText={(v) => setWorking((w) => ({ ...w, name: v }))} placeholder={t('Routine name')} accessibilityLabel={t('Routine name')} testID="routine-name" />
          </View>
          <IconPickerField label={t('Icon')} value={working.iconId} onChange={(v) => setWorking((w) => ({ ...w, iconId: v }))} testID="routine-icon" />

          <View className="flex-row items-center justify-between">
            <Text className="text-secondary text-base font-semibold">{t('Sections')}</Text>
            <Pressable onPress={() => setSectionSheet({ open: true, index: null })} accessibilityRole="button" testID="add-section" className="rounded-full bg-primary px-3 py-1.5">
              <Text className="text-background text-sm font-semibold">{t('add section')}</Text>
            </Pressable>
          </View>

          {working.routineSections.length === 0 ? (
            <Text className="text-description text-sm">{t('No sections added')}</Text>
          ) : (
            <View className="gap-2">
              {working.routineSections.map((section, i) => (
                <SectionCard
                  key={section.id ?? i}
                  section={section}
                  index={i}
                  count={working.routineSections.length}
                  onEdit={() => setSectionSheet({ open: true, index: i })}
                  onAssign={() => setItemSheet(i)}
                  onMove={(dir) => move(i, dir)}
                  onRemove={() => setSections(working.routineSections.filter((_, idx) => idx !== i))}
                />
              ))}
            </View>
          )}

          <View className="mt-2 items-center">
            <Button text={t(isEdit ? 'Edit' : 'Create')} mode="create" submitting={submitting} onPress={save} testID="routine-save" />
          </View>
        </ScrollView>

        <SectionSheet
          visible={sectionSheet.open}
          section={sectionSheet.index !== null ? working.routineSections[sectionSheet.index] : null}
          onSave={upsertSection}
          onClose={() => setSectionSheet({ open: false, index: null })}
        />
        {itemSheet !== null ? (
          <ItemPickerSheet
            visible
            section={working.routineSections[itemSheet]}
            habits={habits}
            tasks={tasks}
            onSave={(s) => setSections(working.routineSections.map((sec, idx) => (idx === itemSheet ? s : sec)))}
            onClose={() => setItemSheet(null)}
          />
        ) : null}
      </View>
    </Modal>
  );
}
