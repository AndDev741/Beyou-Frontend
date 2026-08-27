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
import type { RoutineListItem } from '@beyou/types/routine/routine';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import type category from '@beyou/types/category/categoryType';
import BeyouIcon from '../BeyouIcon';
import IconTile from '../IconTile';
import SegmentedControl from '../SegmentedControl';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import HabitForm from '../habits/HabitForm';
import TaskForm from '../tasks/TaskForm';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch } from '../../store';

interface ListItemPickerSheetProps {
  visible: boolean;
  items: RoutineListItem[];
  habits: habit[];
  tasks: task[];
  onSave: (items: RoutineListItem[]) => void;
  onClose: () => void;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

/**
 * The habit/task picker for a LIST routine.
 *
 * ItemPickerSheet does the same job for a section, except its whole tray is a pair of
 * TimeFields per row fed by suggestSlots. A list has no times to suggest or edit, so this
 * keeps the search, the tabs and the quick-create and drops everything else.
 */
export default function ListItemPickerSheet({
  visible,
  items,
  habits,
  tasks,
  onSave,
  onClose,
}: ListItemPickerSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [working, setWorking] = useState<RoutineListItem[]>([]);
  const [tab, setTab] = useState<'habit' | 'task'>('habit');
  const [search, setSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState<'habit' | 'task' | null>(null);
  const [pending, setPending] = useState<{ type: 'habit' | 'task'; name: string } | null>(null);
  const [fetchedHabits, setFetchedHabits] = useState<habit[] | null>(null);
  const [fetchedTasks, setFetchedTasks] = useState<task[] | null>(null);
  const [cats, setCats] = useState<category[]>([]);

  const allHabits = fetchedHabits ?? habits;
  const allTasks = fetchedTasks ?? tasks;

  useEffect(() => {
    if (!visible) return;
    setWorking(items);
    setTab('habit');
    setSearch('');
    setFetchedHabits(null);
    setFetchedTasks(null);
  }, [visible, items]);

  const takenHabits = useMemo(
    () => new Set(working.filter((i) => i.type === 'HABIT').map((i) => i.habitId)),
    [working],
  );
  const takenTasks = useMemo(
    () => new Set(working.filter((i) => i.type === 'TASK').map((i) => i.taskId)),
    [working],
  );

  const assigned = useMemo(
    () =>
      working.map((item) => {
        const source = item.type === 'HABIT' ? allHabits : allTasks;
        const refId = item.type === 'HABIT' ? item.habitId : item.taskId;
        const found = source.find((entry) => entry.id === refId);
        return { item, refId: refId ?? '', name: found?.name ?? '', iconId: found?.iconId ?? '' };
      }),
    [working, allHabits, allTasks],
  );

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    const pool =
      tab === 'habit'
        ? allHabits.filter((h) => !takenHabits.has(h.id))
        : allTasks.filter((tk) => !takenTasks.has(tk.id));
    return pool
      .filter((item) => !term || item.name?.toLowerCase().includes(term))
      .slice()
      .sort(byName);
  }, [tab, search, allHabits, allTasks, takenHabits, takenTasks]);

  /** New rows carry no id: the server assigns one, and that id is what later edits echo back. */
  const add = (kind: 'habit' | 'task', refId: string) =>
    setWorking((prev) => [
      ...prev,
      {
        id: '',
        type: kind === 'habit' ? 'HABIT' : 'TASK',
        habitId: kind === 'habit' ? refId : null,
        taskId: kind === 'task' ? refId : null,
        orderIndex: prev.length,
      },
    ]);

  const remove = (refId: string) =>
    setWorking((prev) => prev.filter((i) => (i.type === 'HABIT' ? i.habitId : i.taskId) !== refId));

  const openQuickCreate = async (type: 'habit' | 'task') => {
    if (cats.length === 0) {
      const r = await getCategories(t);
      if (Array.isArray(r.success)) setCats(r.success);
    }
    setQuickOpen(type);
  };

  // Same dance as ItemPickerSheet: refetch, then let the effect below add the new row once
  // it lands, matched by name. Dispatched too, so the rest of the builder sees it.
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
    const pool = pending.type === 'habit' ? allHabits : allTasks;
    const taken = pending.type === 'habit' ? takenHabits : takenTasks;
    const found = pool.find((x) => x.name === pending.name && !taken.has(x.id));
    if (found) { add(pending.type, found.id); setPending(null); }
  }, [allHabits, allTasks, pending, takenHabits, takenTasks]);

  /** Closing saves, as in ItemPickerSheet: the routine's own button is what writes. */
  const finish = () => {
    onSave(working.map((item, index) => ({ ...item, orderIndex: index })));
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={finish}>
      <Text className="text-text mb-3 text-lg font-bold">{t('AddToList')}</Text>
      <ScrollView
        testID="list-item-picker-scroll"
        style={{ flexShrink: 1 }}
        contentContainerClassName="gap-3"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-text-2 text-xs font-semibold uppercase">
          {t('Assigned')} ({assigned.length})
        </Text>
        {assigned.length === 0 ? (
          <Text className="text-text-3 text-sm">{t('NothingAssignedYet')}</Text>
        ) : (
          <View className="gap-2">
            {assigned.map(({ item, refId, name, iconId }) => (
              <View
                key={`${item.type}-${refId}`}
                className="flex-row items-center gap-2 rounded-control border border-border bg-accent/5 p-2"
              >
                <BeyouIcon id={iconId} size={18} />
                <Text className="text-text flex-1 text-sm font-semibold" numberOfLines={1}>{name}</Text>
                <Pressable
                  onPress={() => remove(refId)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Remove')}
                  testID={`remove-list-${refId}`}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={22} color={theme.error} />
                </Pressable>
              </View>
            ))}
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
            testID="list-item-picker-search"
            className="min-w-0 flex-1 py-2.5 text-[13.5px] text-text"
          />
        </View>

        <SegmentedControl
          label={t('AddToList')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'habit' as const, label: t('Habits') },
            { value: 'task' as const, label: t('Tasks') },
          ]}
          testID="list-item-picker-kind"
        />

        {available.length === 0 ? (
          <Text className="py-6 text-center text-[13px] text-text-3">
            {search ? t('IconNoResults') : t('NoItemsToAssign')}
          </Text>
        ) : (
          <View className="gap-1.5">
            {available.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => add(tab, it.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t('Add')} ${it.name}`}
                testID={`list-item-${tab}-${it.id}`}
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

        <Pressable
          onPress={() => openQuickCreate(tab)}
          accessibilityRole="button"
          testID={`list-quick-create-${tab}`}
          className="mt-1 flex-row items-center justify-center gap-1.5 rounded-control border border-dashed border-border py-2.5"
        >
          <Ionicons name="add" size={16} color={theme.primary} />
          <Text className="text-accent text-sm font-semibold">
            {tab === 'habit' ? t('CreateHabit') : t('CreateTask')}
          </Text>
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

      <View className="mt-2 border-t border-border pt-3">
        <Button
          text={t('Done')}
          mode="primary"
          size="auto"
          className="w-full"
          onPress={finish}
          testID="list-items-save"
        />
      </View>
    </BottomSheet>
  );
}
