import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Search } from 'lucide-react-native';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import getCategories from '@beyou/api/categories/getCategories';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import type category from '@beyou/types/category/categoryType';
import { suggestSlots } from '@beyou/state';
import { uuidv4 } from '../../lib/uuid';
import BeyouIcon from '../BeyouIcon';
import IconTile from '../IconTile';
import SegmentedControl from '../SegmentedControl';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import HabitForm from '../habits/HabitForm';
import TaskForm from '../tasks/TaskForm';
import TimeField from './TimeField';
import { mergeSectionItems } from './sectionItems';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch } from '../../store';

type HabitGroup = NonNullable<RoutineSection['habitGroup']>[number];
type TaskGroup = NonNullable<RoutineSection['taskGroup']>[number];

interface ItemPickerSheetProps {
  visible: boolean;
  section: RoutineSection;
  habits: habit[];
  tasks: task[];
  onSave: (section: RoutineSection) => void;
  onClose: () => void;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

export default function ItemPickerSheet({ visible, section, habits, tasks, onSave, onClose }: ItemPickerSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [habitGroup, setHabitGroup] = useState<HabitGroup[]>([]);
  const [taskGroup, setTaskGroup] = useState<TaskGroup[]>([]);
  const [tab, setTab] = useState<'habit' | 'task'>('habit');
  const [search, setSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState<'habit' | 'task' | null>(null);
  const [pending, setPending] = useState<{ type: 'habit' | 'task'; name: string } | null>(null);
  // After quick-create we refetch locally (no redux dep) and render the merged lists.
  const [fetchedHabits, setFetchedHabits] = useState<habit[] | null>(null);
  const [fetchedTasks, setFetchedTasks] = useState<task[] | null>(null);
  const [cats, setCats] = useState<category[]>([]);

  const allHabits = fetchedHabits ?? habits;
  const allTasks = fetchedTasks ?? tasks;

  useEffect(() => {
    if (!visible) return;
    setHabitGroup(section.habitGroup ?? []);
    setTaskGroup(section.taskGroup ?? []);
    setTab('habit');
    setSearch('');
    setFetchedHabits(null);
    setFetchedTasks(null);
  }, [visible, section]);

  // The tray (selected items, both types) — name/icon resolved, sorted.
  const assigned = useMemo(
    () => mergeSectionItems({ ...section, habitGroup, taskGroup }, allHabits, allTasks),
    [section, habitGroup, taskGroup, allHabits, allTasks],
  );

  // Available = items of the active tab NOT yet selected, sorted A→Z.
  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    const pool =
      tab === 'habit'
        ? allHabits.filter((h) => !habitGroup.some((g) => g.habitId === h.id))
        : allTasks.filter((tk) => !taskGroup.some((g) => g.taskId === tk.id));
    return pool
      .filter((item) => !term || item.name?.toLowerCase().includes(term))
      .slice()
      .sort(byName);
  }, [tab, search, allHabits, allTasks, habitGroup, taskGroup]);

  /**
   * The next item's time: resumes where the assigned ones stopped and splits what
   * is left of the section's window. Same maths as the web (`suggestSlots`), which
   * now lives in the shared package — before this the item arrived with no time at
   * all and every row had to be filled by hand.
   */
  const nextSlot = () =>
    suggestSlots({ ...section, habitGroup, taskGroup }, 1)[0] ?? { startTime: '', endTime: '' };

  const addHabit = (id: string) => {
    const slot = nextSlot();
    setHabitGroup((g) => [
      ...g,
      { id: uuidv4(), habitId: id, startTime: slot.startTime, endTime: slot.endTime ?? '' },
    ]);
  };
  const addTask = (id: string) => {
    const slot = nextSlot();
    setTaskGroup((g) => [
      ...g,
      { id: uuidv4(), taskId: id, startTime: slot.startTime, endTime: slot.endTime ?? '' },
    ]);
  };
  const removeHabit = (id: string) => setHabitGroup((g) => g.filter((x) => x.habitId !== id));
  const removeTask = (id: string) => setTaskGroup((g) => g.filter((x) => x.taskId !== id));

  const setHabitField = (id: string, field: 'startTime' | 'endTime', v: string) =>
    setHabitGroup((g) => g.map((x) => (x.habitId === id ? { ...x, [field]: v } : x)));
  const setTaskField = (id: string, field: 'startTime' | 'endTime', v: string) =>
    setTaskGroup((g) => g.map((x) => (x.taskId === id ? { ...x, [field]: v } : x)));

  // Open quick-create: lazy-load categories for the nested form, then show it.
  const openQuickCreate = async (type: 'habit' | 'task') => {
    if (cats.length === 0) {
      const r = await getCategories(t);
      if (Array.isArray(r.success)) setCats(r.success);
    }
    setQuickOpen(type);
  };

  // Quick-create: after the new habit/task is created, refetch its list and mark it
  // pending so the auto-add effect assigns it once it lands in the merged list (by name).
  // Also dispatch to the store so the rest of the builder (SectionCard, the routines
  // screen) sees the new item — local `fetched` alone wouldn't reach those siblings.
  const handleQuickCreated = async (type: 'habit' | 'task', name: string) => {
    setPending({ type, name });
    if (type === 'habit') {
      const r = await getHabits(t);
      if (Array.isArray(r.success)) { setFetchedHabits(r.success); dispatch(enterHabits(r.success)); }
    } else {
      const r = await getTasks(t);
      if (Array.isArray(r.success)) { setFetchedTasks(r.success); dispatch(enterTasks(r.success)); }
    }
  };

  useEffect(() => {
    if (!pending) return;
    if (pending.type === 'habit') {
      const h = allHabits.find((x) => x.name === pending.name && !habitGroup.some((g) => g.habitId === x.id));
      if (h) { addHabit(h.id); setPending(null); }
    } else {
      const tk = allTasks.find((x) => x.name === pending.name && !taskGroup.some((g) => g.taskId === x.id));
      if (tk) { addTask(tk.id); setPending(null); }
    }
  }, [allHabits, allTasks, pending, habitGroup, taskGroup]);

  /**
   * Closing SAVES. What you pick here only touches the routine's working copy —
   * the routine's own button is what really writes — so leaving through the
   * backdrop or the system back button and losing everything was just a trap.
   */
  const finish = () => {
    onSave({ ...section, habitGroup, taskGroup });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={finish}>
      <Text className="text-text mb-3 text-lg font-bold">{t('AssignItems')}</Text>
      {/* flexShrink, NOT flex-1. The BottomSheet panel is capped with `max-h`, not
          given a height, so it sizes to its content — and `flex-1` means
          `flexBasis: 0`, which contributes zero height to that measurement. The
          panel then closed around just the title and the footer and left this
          list at 0px: the sheet opened empty. Shrink keeps it content-sized while
          still letting it give way (and scroll) once the panel hits its cap.
          Inline style because this is layout-critical — see the NativeWind margin
          caveat in AGENTS.md. */}
      <ScrollView
        testID="item-picker-scroll"
        style={{ flexShrink: 1 }}
        contentContainerClassName="gap-3"
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected tray */}
        <Text className="text-text-2 text-xs font-semibold uppercase">{t('Assigned')} ({assigned.length})</Text>
        {assigned.length === 0 ? (
          <Text className="text-text-3 text-sm">{t('NothingAssignedYet')}</Text>
        ) : (
          <View className="gap-2">
            {assigned.map((item) => {
              const remove = item.type === 'habit' ? removeHabit : removeTask;
              const setField = item.type === 'habit' ? setHabitField : setTaskField;
              return (
                <View key={item.key} className="rounded-control border border-border bg-accent/5 p-2">
                  <View className="flex-row items-center gap-2">
                    <BeyouIcon id={item.iconId} size={18} />
                    <Text className="text-text flex-1 text-sm font-semibold" numberOfLines={1}>{item.name}</Text>
                    <Pressable onPress={() => remove(item.refId)} accessibilityRole="button" accessibilityLabel={t('Remove')} testID={`remove-${item.type}-${item.refId}`} hitSlop={8}>
                      <Ionicons name="close-circle" size={22} color={theme.error} />
                    </Pressable>
                  </View>
                  <View className="mt-2 flex-row gap-3">
                    <TimeField label={t('Start')} value={item.startTime} onChange={(v) => setField(item.refId, 'startTime', v)} testID={`tray-${item.type}-${item.refId}-start`} />
                    <TimeField label={t('End')} value={item.endTime} onChange={(v) => setField(item.refId, 'endTime', v)} testID={`tray-${item.type}-${item.refId}-end`} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View className="mt-1 flex-row items-center gap-2 rounded-control border border-border bg-surface px-3">
          <Search size={16} color={theme.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('SearchHabitOrTask')}
            placeholderTextColor={theme.text3}
            accessibilityLabel={t('SearchHabitOrTask')}
            testID="item-picker-search"
            className="min-w-0 flex-1 py-2.5 text-[13.5px] text-text"
          />
        </View>

        <SegmentedControl
          label={t('RoutineTypeLabel')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'habit' as const, label: t('Habits') },
            { value: 'task' as const, label: t('Tasks') },
          ]}
          testID="item-picker-kind"
        />

        {/* Available list for the active tab */}
        {available.length === 0 ? (
          <Text className="py-6 text-center text-[13px] text-text-3">
            {search ? t('IconNoResults') : t('NoItemsToAssign')}
          </Text>
        ) : (
          <View className="gap-1.5">
            {/* One tap assigns: the item rises into the tray with the suggested time
                and leaves this list. Ticking first and confirming later was one extra
                step with nothing in return. */}
            {available.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => (tab === 'habit' ? addHabit(it.id) : addTask(it.id))}
                accessibilityRole="button"
                accessibilityLabel={`${t('Add')} ${it.name}`}
                testID={`item-${tab}-${it.id}`}
                className="flex-row items-center gap-2.5 rounded-[9px] border border-border bg-surface px-2.5 py-[7px] active:bg-surface-2"
              >
                <IconTile size={24}>
                  <BeyouIcon id={it.iconId} size={13} />
                </IconTile>
                <Text className="min-w-0 flex-1 text-[12.5px] font-medium text-text" numberOfLines={1}>
                  {it.name}
                </Text>
                <Ionicons name="add" size={18} color={theme.text3} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick-create a new habit/task without leaving the routine builder. */}
        <Pressable
          onPress={() => openQuickCreate(tab)}
          accessibilityRole="button"
          testID={`quick-create-${tab}`}
          className="mt-1 flex-row items-center justify-center gap-1.5 rounded-control border border-dashed border-border py-2.5"
        >
          <Ionicons name="add" size={16} color={theme.primary} />
          <Text className="text-accent text-sm font-semibold">{tab === 'habit' ? t('CreateHabit') : t('CreateTask')}</Text>
        </Pressable>
      </ScrollView>

      {quickOpen === 'habit' ? (
        <HabitForm
          visible
          mode="create"
          categories={cats}
          onCreated={(name) => handleQuickCreated('habit', name)}
          onSaved={() => {}}
          onClose={() => setQuickOpen(null)}
        />
      ) : null}
      {quickOpen === 'task' ? (
        <TaskForm
          visible
          mode="create"
          categories={cats}
          onCreated={(name) => handleQuickCreated('task', name)}
          onSaved={() => {}}
          onClose={() => setQuickOpen(null)}
        />
      ) : null}

      {/* Fixed footer: one action, always in sight. There is no "cancel" because
          não há o que cancelar — nada saiu daqui para o servidor. */}
      <View className="mt-2 border-t border-border pt-3">
        <Button
          text={t('Done')}
          mode="primary"
          size="auto"
          className="w-full"
          onPress={finish}
          testID="items-save"
        />
      </View>
    </BottomSheet>
  );
}
