import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import { uuidv4 } from '../../lib/uuid';
import BeyouIcon from '../BeyouIcon';
import Button from '../Button';
import TimeField from './TimeField';

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

export default function ItemPickerSheet({ visible, section, habits, tasks, onSave, onClose }: ItemPickerSheetProps) {
  const { t } = useTranslation();
  const [habitGroup, setHabitGroup] = useState<HabitGroup[]>([]);
  const [taskGroup, setTaskGroup] = useState<TaskGroup[]>([]);

  useEffect(() => {
    if (!visible) return;
    setHabitGroup(section.habitGroup ?? []);
    setTaskGroup(section.taskGroup ?? []);
  }, [visible, section]);

  const toggleHabit = (id: string) =>
    setHabitGroup((g) => g.some((x) => x.habitId === id)
      ? g.filter((x) => x.habitId !== id)
      : [...g, { id: uuidv4(), habitId: id, startTime: section.startTime, endTime: '' }]);

  const toggleTask = (id: string) =>
    setTaskGroup((g) => g.some((x) => x.taskId === id)
      ? g.filter((x) => x.taskId !== id)
      : [...g, { id: uuidv4(), taskId: id, startTime: section.startTime, endTime: '' }]);

  const setHabitTime = (id: string, startTime: string) =>
    setHabitGroup((g) => g.map((x) => (x.habitId === id ? { ...x, startTime } : x)));

  const setTaskTime = (id: string, startTime: string) =>
    setTaskGroup((g) => g.map((x) => (x.taskId === id ? { ...x, startTime } : x)));

  const save = () => { onSave({ ...section, habitGroup, taskGroup }); onClose(); };

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel={t('Cancel')} />
      <View className="absolute bottom-0 left-0 right-0 max-h-[85%] rounded-t-2xl bg-background p-4">
        <Text className="text-secondary mb-3 text-lg font-bold">{t('AssignItems')}</Text>
        <ScrollView contentContainerClassName="gap-2" keyboardShouldPersistTaps="handled">
          {habits.map((h) => {
            const sel = habitGroup.find((x) => x.habitId === h.id);
            return (
              <View key={h.id} className="flex-row items-center gap-2">
                <Pressable onPress={() => toggleHabit(h.id)} accessibilityRole="button" accessibilityState={{ selected: !!sel }} testID={`item-habit-${h.id}`}
                  className={`flex-1 flex-row items-center gap-2 rounded-lg border p-2 ${sel ? 'border-primary bg-primary/10' : 'border-primary/30'}`}>
                  <BeyouIcon id={h.iconId} size={18} />
                  <Text className={`flex-1 text-sm ${sel ? 'text-primary font-semibold' : 'text-secondary'}`}>{h.name}</Text>
                </Pressable>
                {sel ? <View className="w-[90px]"><TimeField value={sel.startTime} onChange={(v) => setHabitTime(h.id, v)} testID={`item-habit-${h.id}-time`} /></View> : null}
              </View>
            );
          })}
          {tasks.map((tk) => {
            const sel = taskGroup.find((x) => x.taskId === tk.id);
            return (
              <View key={tk.id} className="flex-row items-center gap-2">
                <Pressable onPress={() => toggleTask(tk.id)} accessibilityRole="button" accessibilityState={{ selected: !!sel }} testID={`item-task-${tk.id}`}
                  className={`flex-1 flex-row items-center gap-2 rounded-lg border p-2 ${sel ? 'border-primary bg-primary/10' : 'border-primary/30'}`}>
                  <BeyouIcon id={tk.iconId} size={18} />
                  <Text className={`flex-1 text-sm ${sel ? 'text-primary font-semibold' : 'text-secondary'}`}>{tk.name}</Text>
                </Pressable>
                {sel ? <View className="w-[90px]"><TimeField value={sel.startTime} onChange={(v) => setTaskTime(tk.id, v)} testID={`item-task-${tk.id}-time`} /></View> : null}
              </View>
            );
          })}
          <View className="mt-2 flex-row justify-end gap-3">
            <Pressable onPress={onClose} accessibilityRole="button" className="px-4 py-2"><Text className="text-description font-semibold">{t('Cancel')}</Text></Pressable>
            <Button text={t('Save')} mode="create" size="small" onPress={save} testID="items-save" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
