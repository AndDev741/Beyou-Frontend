import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Pin, PinOff, Plus, X } from 'lucide-react-native';
import {
  MAX_MICRO_TASKS,
  MICRO_TASK_MAX_LENGTH,
  isMicroTaskDone,
  microTaskAdded,
  microTaskPinToggled,
  microTaskRemoved,
  microTaskToggled,
  microTasksHydrated,
} from '@beyou/state';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { loadMicroTasks, saveMicroTasks } from '../lib/microTasks';
import Ring from '../ui/Ring';
import type { RootState, AppDispatch } from '../store';

/**
 * The small things done between cycles, under the timer where the reference design puts them.
 *
 * Native twin of the web component. Two kinds, from the backlog card: standing ones and one-off
 * ones. Adding makes a ONE-OFF, and pinning is a separate tap on the row — typing something in a
 * break costs one field and one submit, and nothing silently accumulates forever.
 *
 * A pinned task's tick is a DATE, not a boolean, so it comes back fresh tomorrow like every other
 * checkable thing in Beyou.
 */
export default function MicroTasks({ date }: { date: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  /**
   * Falls back, mirroring the web component. Redux is in-memory here so there is nothing stale to
   * rehydrate, but the two staying identical is worth more than saving one `??`.
   */
  const tasks = useSelector((s: RootState) => s.focus.microTasks) ?? [];

  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Read the standing ones once, on mount. Merged rather than replacing, so a one-off typed
  // before this resolved is not swallowed by it.
  useEffect(() => {
    let active = true;
    loadMicroTasks().then((stored) => {
      if (active) dispatch(microTasksHydrated(stored));
    });
    return () => {
      active = false;
    };
  }, [dispatch]);

  // Mirrored back on every change. Only the pinned ones are written; see the storage module.
  useEffect(() => {
    void saveMicroTasks(tasks, date);
  }, [tasks, date]);

  const full = tasks.length >= MAX_MICRO_TASKS;

  const submit = () => {
    const name = draft.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    dispatch(microTaskAdded(name));
    setDraft('');
    // Left open: a break checklist is usually typed in a burst of two or three.
    inputRef.current?.focus();
  };

  return (
    <View testID="focus-micro-tasks">
      <Text className="text-[12.5px] font-semibold uppercase tracking-[1px] text-text-3">
        {t('FocusTasks')}
      </Text>

      <View className="mt-1.5 gap-1">
        {tasks.map((task) => {
          const done = isMicroTaskDone(task, date);
          return (
            <View
              key={task.id}
              className="flex-row items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1.5"
              testID={`focus-micro-task-${task.id}`}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={task.name}
                onPress={() => dispatch(microTaskToggled({ id: task.id, date }))}
                className="flex-1 flex-row items-center gap-2.5"
                testID={`focus-micro-task-check-${task.id}`}
              >
                <Ring size={20} state={done ? 'done' : 'todo'} />
                <Text
                  className={`flex-1 text-[13px] ${done ? 'text-text-3 line-through' : 'text-text'}`}
                  numberOfLines={1}
                >
                  {task.name}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={task.pinned ? t('FocusStopKeepingTask') : t('FocusKeepTask')}
                accessibilityState={{ selected: task.pinned }}
                onPress={() => dispatch(microTaskPinToggled(task.id))}
                className="h-7 w-7 items-center justify-center rounded-control active:bg-surface-2"
                testID={`focus-micro-task-pin-${task.id}`}
              >
                {task.pinned ? (
                  <Pin size={14} color={theme.accent} />
                ) : (
                  <PinOff size={14} color={theme.text3} />
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('FocusRemoveTask')}
                onPress={() => dispatch(microTaskRemoved(task.id))}
                className="h-7 w-7 items-center justify-center rounded-control active:bg-surface-2"
                testID={`focus-micro-task-remove-${task.id}`}
              >
                <X size={14} color={theme.text3} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {adding ? (
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          maxLength={MICRO_TASK_MAX_LENGTH}
          onSubmitEditing={submit}
          onBlur={submit}
          autoFocus
          placeholder={t('FocusTaskPlaceholder')}
          placeholderTextColor={theme.text3}
          returnKeyType="done"
          className="mt-1.5 h-10 rounded-control border border-border bg-surface px-2.5 text-[13px] text-text"
          testID="focus-micro-task-input"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: full }}
          disabled={full}
          onPress={() => setAdding(true)}
          className={`mt-1.5 h-10 flex-row items-center justify-center gap-2 rounded-control border border-dashed border-border active:bg-surface-2 ${
            full ? 'opacity-60' : ''
          }`}
          testID="focus-micro-task-add"
        >
          <Plus size={15} color={theme.text2} />
          <Text className="text-[13px] font-medium text-text-2">
            {full ? t('FocusTasksFull') : t('FocusAddTask')}
          </Text>
        </Pressable>
      )}

      {tasks.length === 0 && !adding ? (
        <Text className="mt-2 text-center text-[12px] text-text-3">{t('FocusTasksEmpty')}</Text>
      ) : null}
    </View>
  );
}
