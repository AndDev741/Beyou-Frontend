import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import getCategories from '@beyou/api/categories/getCategories';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import type category from '@beyou/types/category/categoryType';
import { uuidv4 } from '../../lib/uuid';
import BeyouIcon from '../BeyouIcon';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import HabitForm from '../habits/HabitForm';
import TaskForm from '../tasks/TaskForm';
import TimeField from './TimeField';
import { mergeSectionItems } from './sectionItems';
import { useBeyouTheme } from '../../theme/ThemeProvider';

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
  const [habitGroup, setHabitGroup] = useState<HabitGroup[]>([]);
  const [taskGroup, setTaskGroup] = useState<TaskGroup[]>([]);
  const [tab, setTab] = useState<'habit' | 'task'>('habit');
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
    if (tab === 'habit') return allHabits.filter((h) => !habitGroup.some((g) => g.habitId === h.id)).slice().sort(byName);
    return allTasks.filter((tk) => !taskGroup.some((g) => g.taskId === tk.id)).slice().sort(byName);
  }, [tab, allHabits, allTasks, habitGroup, taskGroup]);

  const addHabit = (id: string) => setHabitGroup((g) => [...g, { id: uuidv4(), habitId: id, startTime: '', endTime: '' }]);
  const addTask = (id: string) => setTaskGroup((g) => [...g, { id: uuidv4(), taskId: id, startTime: '', endTime: '' }]);
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
  const handleQuickCreated = async (type: 'habit' | 'task', name: string) => {
    setPending({ type, name });
    if (type === 'habit') {
      const r = await getHabits(t);
      if (Array.isArray(r.success)) setFetchedHabits(r.success);
    } else {
      const r = await getTasks(t);
      if (Array.isArray(r.success)) setFetchedTasks(r.success);
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

  const save = () => { onSave({ ...section, habitGroup, taskGroup }); onClose(); };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-secondary mb-3 text-lg font-bold">{t('AssignItems')}</Text>
      <ScrollView className="flex-1" contentContainerClassName="gap-3" keyboardShouldPersistTaps="handled">
        {/* Selected tray */}
        <Text className="text-description text-xs font-semibold uppercase">{t('Assigned')} ({assigned.length})</Text>
        {assigned.length === 0 ? (
          <Text className="text-placeholder text-sm">{t('NothingAssignedYet')}</Text>
        ) : (
          <View className="gap-2">
            {assigned.map((item) => {
              const remove = item.type === 'habit' ? removeHabit : removeTask;
              const setField = item.type === 'habit' ? setHabitField : setTaskField;
              return (
                <View key={item.key} className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                  <View className="flex-row items-center gap-2">
                    <BeyouIcon id={item.iconId} size={18} />
                    <Text className="text-secondary flex-1 text-sm font-semibold" numberOfLines={1}>{item.name}</Text>
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

        {/* Tabs */}
        <View className="mt-1 flex-row rounded-full border border-primary/30 p-1">
          {(['habit', 'task'] as const).map((tk) => (
            <Pressable
              key={tk}
              onPress={() => setTab(tk)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === tk }}
              testID={`tab-${tk}`}
              className={`flex-1 items-center rounded-full py-1.5 ${tab === tk ? 'bg-primary' : ''}`}
            >
              <Text className={`text-sm font-semibold ${tab === tk ? 'text-background' : 'text-secondary'}`}>
                {tk === 'habit' ? t('Habits') : t('Tasks')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Available list for the active tab */}
        {available.length === 0 ? (
          <Text className="text-placeholder text-sm">{t('NoItemsToAssign')}</Text>
        ) : (
          <View className="gap-2">
            {available.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => (tab === 'habit' ? addHabit(it.id) : addTask(it.id))}
                accessibilityRole="button"
                testID={`item-${tab}-${it.id}`}
                className="flex-row items-center gap-2 rounded-lg border border-primary/30 p-2"
              >
                <BeyouIcon id={it.iconId} size={18} />
                <Text className="text-secondary flex-1 text-sm" numberOfLines={1}>{it.name}</Text>
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick-create a new habit/task without leaving the routine builder. */}
        <Pressable
          onPress={() => openQuickCreate(tab)}
          accessibilityRole="button"
          testID={`quick-create-${tab}`}
          className="mt-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/50 py-2.5"
        >
          <Ionicons name="add" size={16} color={theme.primary} />
          <Text className="text-primary text-sm font-semibold">{tab === 'habit' ? t('CreateHabit') : t('CreateTask')}</Text>
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

      {/* Fixed footer — actions stay visible regardless of scroll. */}
      <View className="mt-2 flex-row justify-end gap-3 border-t border-primary/10 pt-3">
        <Pressable onPress={onClose} accessibilityRole="button" className="px-4 py-2"><Text className="text-description font-semibold">{t('Cancel')}</Text></Pressable>
        <Button text={t('Save')} mode="create" size="small" onPress={save} testID="items-save" />
      </View>
    </BottomSheet>
  );
}
