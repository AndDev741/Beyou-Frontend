import { useContext, useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { routineFormSchema, routineListFormSchema, getSectionErrorKeys, getItemTimeErrorKeys } from '@beyou/validation';
import createRoutine from '@beyou/api/routine/createRoutine';
import editRoutine from '@beyou/api/routine/editRoutine';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { getListItems, isListRoutine } from '@beyou/state';
import type { Routine, RoutineListItem } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import Input from '../Input';
import { useKeyboardLift } from '../keyboard';
import Button from '../Button';
import GhostAdd from '../GhostAdd';
import IconButton from '../IconButton';
import SegmentedControl from '../SegmentedControl';
import SectionSheet from './SectionSheet';
import ItemPickerSheet from './ItemPickerSheet';
import ListItemPickerSheet from './ListItemPickerSheet';
import ListItemsEditor from './ListItemsEditor';
import SectionCard from './SectionCard';
import type { MergedSectionItem } from './sectionItems';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import { ModalToastHost } from '../BeyouToast';

interface RoutineBuilderProps {
  visible: boolean;
  mode: 'create' | 'edit';
  routine?: Routine | null;
  habits: habit[];
  tasks: task[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyRoutine = (): Routine => ({ name: '', iconId: '', type: 'DAILY', routineSections: [], items: [] });

export default function RoutineBuilder({ visible, mode, routine, habits, tasks, onClose, onSaved }: RoutineBuilderProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  // A Modal is its own window and Android stopped resizing it under the
  // edge-to-edge layout, so the name field and the Save row at the foot of the
  // scroll sat behind the keyboard. See `useKeyboardLift`.
  const { lift, onLayout } = useKeyboardLift();
  // The navigation bar's inset goes while the keyboard is up: that bar is behind
  // the keyboard, so its padding would only add dead space under the buttons.
  const bottomPad = (lift > 0 ? 0 : (insets?.bottom ?? 0)) + 16;
  const isEdit = mode === 'edit';
  const [working, setWorking] = useState<Routine>(emptyRoutine());
  const [sectionSheet, setSectionSheet] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [itemSheet, setItemSheet] = useState<number | null>(null);
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [listItems, setListItems] = useState<RoutineListItem[]>([]);
  const isList = isListRoutine(working);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    // Deep clone so edits never mutate the slice.
    const next: Routine = routine ? JSON.parse(JSON.stringify(routine)) : emptyRoutine();
    setWorking(next);
    setListItems(isListRoutine(next) ? getListItems(next) : []);
    setFormError(undefined);
  }, [visible, routine, isEdit]);

  const moveListItem = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= listItems.length) return;
    const next = [...listItems];
    [next[index], next[to]] = [next[to], next[index]];
    setListItems(next);
  };

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

    // A list is validated against its own schema: routineFormSchema demands at least one
    // section with a start time, which is exactly what this shape does not have.
    const payload: Routine = isList
      ? { ...working, routineSections: [], items: listItems.map((item, i) => ({ ...item, orderIndex: i })) }
      : working;

    if (isList) {
      const parsed = routineListFormSchema(t).safeParse({
        routineName: payload.name,
        items: payload.items,
      });
      if (!parsed.success) {
        fail(parsed.error.issues[0]?.message ?? t('UnexpectedError'));
        return;
      }
    } else {
      const parsed = routineFormSchema(t).safeParse({
        routineName: working.name,
        routineSections: working.routineSections,
      });
      if (!parsed.success) {
        fail(sectionQualifiedError() ?? parsed.error.issues[0]?.message ?? t('UnexpectedError'));
        return;
      }
    }

    setSubmitting(true);
    const res = isEdit ? await editRoutine(payload, t) : await createRoutine(payload, t);
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
      <View
        className="flex-1 bg-surface"
        onLayout={onLayout}
        style={{ paddingTop: insets?.top ?? 0, paddingBottom: lift }}
        testID="routine-builder-keyboard-avoider"
      >
        {/* The web modal's header: title on the left, × on the right. The actions sit
            at the foot, where the thumb already is after filling the form. */}
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
          {/* Daily is sections with time windows; list is a plain checklist. Locked while
              editing: the backend refuses a type change, because switching would either
              discard every window the user set or invent times nobody chose. */}
          <View>
            <Text className="mb-1.5 text-[12.5px] font-semibold text-text-2">
              {t('RoutineTypeLabel')}
            </Text>
            <SegmentedControl
              className="w-full"
              label={t('RoutineTypeLabel')}
              value={isList ? 'list' : 'daily'}
              onChange={(value) => setWorking((w) => ({ ...w, type: value === 'list' ? 'LIST' : 'DAILY' }))}
              testID="routine-type"
              options={[
                {
                  value: 'daily',
                  label: t('RoutineTypeDaily'),
                  description: t('RoutineTypeDailyDescription'),
                  disabled: isEdit,
                },
                {
                  value: 'list',
                  label: t('RoutineTypeList'),
                  description: t('RoutineTypeListDescription'),
                  disabled: isEdit,
                },
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

          {isList ? (
            <ListItemsEditor
              items={listItems}
              habits={habits}
              tasks={tasks}
              onMove={moveListItem}
              onRemove={(index) => setListItems((prev) => prev.filter((_, i) => i !== index))}
              onAdd={() => setListSheetOpen(true)}
            />
          ) : (
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
          )}

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
        <ListItemPickerSheet
          visible={listSheetOpen}
          items={listItems}
          habits={habits}
          tasks={tasks}
          onSave={setListItems}
          onClose={() => setListSheetOpen(false)}
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
      {/* Toasts must be hosted INSIDE the modal's native window. See ModalToastHost. */}
      <ModalToastHost />
    </Modal>
  );
}
