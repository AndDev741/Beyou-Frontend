import { useContext, useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { routineFormSchema, getSectionErrorKeys, getItemTimeErrorKeys } from '@beyou/validation';
import createRoutine from '@beyou/api/routine/createRoutine';
import editRoutine from '@beyou/api/routine/editRoutine';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import Input from '../Input';
import Button from '../Button';
import GhostAdd from '../GhostAdd';
import IconButton from '../IconButton';
import SegmentedControl from '../SegmentedControl';
import SectionSheet from './SectionSheet';
import ItemPickerSheet from './ItemPickerSheet';
import SectionCard from './SectionCard';
import type { MergedSectionItem } from './sectionItems';
import { useBeyouTheme } from '../../theme/ThemeProvider';
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
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const bottomPad = (insets?.bottom ?? 0) + 16;
  const isEdit = mode === 'edit';
  const [working, setWorking] = useState<Routine>(emptyRoutine());
  const [sectionSheet, setSectionSheet] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [itemSheet, setItemSheet] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    // Deep clone so edits never mutate the slice.
    setWorking(routine ? JSON.parse(JSON.stringify(routine)) : emptyRoutine());
    setFormError(undefined);
  }, [visible, routine, isEdit]);

  const setSections = (routineSections: RoutineSection[]) =>
    setWorking((w) => ({ ...w, routineSections: routineSections.map((s, i) => ({ ...s, order: i })) }));

  const upsertSection = (section: RoutineSection) => {
    const list = [...(working.routineSections ?? [])];
    if (sectionSheet.index === null) list.push(section);
    else list[sectionSheet.index] = section;
    setSections(list);
  };

  const patchSection = (index: number, patch: Partial<RoutineSection>) =>
    setSections(working.routineSections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  /** Drops the habit/task from the section — the right group for the item's type. */
  const removeItem = (index: number, item: MergedSectionItem) => {
    const section = working.routineSections[index];
    patchSection(
      index,
      item.type === 'habit'
        ? { habitGroup: (section.habitGroup ?? []).filter((g) => g.habitId !== item.refId) }
        : { taskGroup: (section.taskGroup ?? []).filter((g) => g.taskId !== item.refId) },
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const list = [...working.routineSections];
    const to = index + dir;
    if (to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    setSections(list);
  };

  // Find the first section/item time problem and qualify it with the section name —
  // clearer than the schema's generic message ("Morning: item time is outside the section").
  const sectionQualifiedError = (): string | null => {
    for (const section of working.routineSections) {
      const prefix = section.name ? `${section.name}: ` : '';
      const secErrs = getSectionErrorKeys(section.name, section.startTime);
      if (secErrs.length) return `${prefix}${t(secErrs[0])}`;
      const groups = [...(section.taskGroup ?? []), ...(section.habitGroup ?? [])];
      for (const g of groups) {
        const itemErrs = getItemTimeErrorKeys(section.startTime, section.endTime, g.startTime, g.endTime);
        if (itemErrs.length) return `${prefix}${t(itemErrs[0])}`;
      }
    }
    return null;
  };

  const fail = (msg: string) => { setFormError(msg); notify.error(msg); };

  const save = async () => {
    setFormError(undefined);
    const parsed = routineFormSchema(t).safeParse({
      routineName: working.name,
      routineSections: working.routineSections,
    });
    if (!parsed.success) {
      fail(sectionQualifiedError() ?? parsed.error.issues[0]?.message ?? t('UnexpectedError'));
      return;
    }
    setSubmitting(true);
    const res = isEdit ? await editRoutine(working, t) : await createRoutine(working, t);
    setSubmitting(false);
    if (res.error) { fail(getFriendlyErrorMessage(t, res.error)); return; }
    if (res.validation) { fail(res.validation); return; }
    notify.success(t(isEdit ? 'edited successfully' : 'created successfully'));
    onSaved();
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-surface" style={{ paddingTop: insets?.top ?? 0 }}>
        {/* The web modal's header: title on the left, × on the right. The actions
            ficam no pé, onde o polegar já está depois de preencher. */}
        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <Text
            accessibilityRole="header"
            className="min-w-0 flex-1 text-base font-semibold tracking-[-0.01em] text-text"
          >
            {t(isEdit ? 'Edit Routine' : 'Create routine')}
          </Text>
          <IconButton label={t('Close')} onPress={onClose} testID="routine-form-close">
            <X size={16} color={theme.text3} />
          </IconButton>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-4 pt-4"
          contentContainerStyle={{ paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Only the daily routine exists; the list one is designed and shows
              dimmed instead of hidden, as on the web. This replaces the
              escolha que abria a criação com duas ilustrações. */}
          <View>
            <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">
              {t('RoutineTypeLabel')}
            </Text>
            <SegmentedControl
              className="w-full"
              label={t('RoutineTypeLabel')}
              value="daily"
              onChange={() => {}}
              testID="routine-type"
              options={[
                { value: 'daily', label: t('RoutineTypeDaily') },
                { value: 'list', label: t('RoutineTypeList'), disabled: true },
              ]}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">{t('Name')}</Text>
            <Input
              value={working.name}
              onChangeText={(v) => setWorking((w) => ({ ...w, name: v }))}
              placeholder={t('Routine name')}
              accessibilityLabel={t('Routine name')}
              compact
              testID="routine-name"
            />
          </View>

          <View>
            <Text className="mb-2 text-[13px] font-semibold text-text-2">{t('Sections')}</Text>
            <View className="gap-2">
              {working.routineSections.map((section, i) => (
                <SectionCard
                  key={section.id ?? i}
                  section={section}
                  index={i}
                  count={working.routineSections.length}
                  habits={habits}
                  tasks={tasks}
                  onEdit={() => setSectionSheet({ open: true, index: i })}
                  onAssign={() => setItemSheet(i)}
                  onMove={(dir) => move(i, dir)}
                  onRemove={() => setSections(working.routineSections.filter((_, idx) => idx !== i))}
                  onRemoveItem={(item) => removeItem(i, item)}
                  onToggleFavorite={() => patchSection(i, { favorite: !section.favorite })}
                />
              ))}
            </View>
            <GhostAdd
              label={t('New section')}
              onPress={() => setSectionSheet({ open: true, index: null })}
              className={working.routineSections.length > 0 ? 'mt-2' : ''}
              testID="add-section"
            />
          </View>

          {formError ? (
            <Text className="text-center text-[12.5px] font-semibold text-danger" testID="routine-form-error">
              {formError}
            </Text>
          ) : null}

          <View className="mt-2 flex-row justify-end gap-2">
            <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} testID="routine-form-cancel" />
            <Button
              text={t('Save routine')}
              mode="primary"
              size="auto"
              submitting={submitting}
              onPress={save}
              testID="routine-save"
            />
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
