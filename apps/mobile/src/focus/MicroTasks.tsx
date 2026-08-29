import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Pin, PinOff, Plus, X } from 'lucide-react-native';
import {
  MICRO_TASK_MAX_LENGTH,
  isMicroTaskDone,
  microTaskRemoved,
  microTaskUpserted,
  microTasksLoaded,
  normalizeMicroTaskName,
} from '@beyou/state';
import {
  addFocusMicroTask,
  deleteFocusMicroTask,
  listFocusMicroTasks,
  pinFocusMicroTask,
  reorderFocusMicroTasks,
  toggleFocusMicroTask,
} from '@beyou/api/focus/focusApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { notify } from '../notify';
import Ring from '../ui/Ring';
import type { RootState, AppDispatch } from '../store';

/**
 * The small things done alongside ONE routine item. Native twin of the web component.
 *
 * Server-owned since F6, scoped to the item on the user's specification: switching items switches
 * lists, and a pinned name appears on the new item because the server materialised it there on the
 * read. Every mutation goes to the server and the response is what lands in the slice.
 */
export default function MicroTasks({ itemGroupId }: { itemGroupId: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector((s: RootState) => s.focus.microTasks?.[itemGroupId]) ?? [];

  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let active = true;
    listFocusMicroTasks(itemGroupId, t).then((result) => {
      if (!active) return;
      if (result.success) dispatch(microTasksLoaded({ itemGroupId, tasks: result.success }));
      else if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
    });
    return () => {
      active = false;
    };
  }, [itemGroupId, dispatch, t]);

  const submit = async () => {
    const name = normalizeMicroTaskName(draft);
    if (!name) {
      setAdding(false);
      return;
    }
    setBusy(true);
    const result = await addFocusMicroTask({ itemGroupId, name, pinned: false }, t);
    setBusy(false);
    if (result.success) {
      dispatch(microTaskUpserted(result.success));
      setDraft('');
      inputRef.current?.focus();
    } else if (result.error) {
      notify.error(getFriendlyErrorMessage(t, result.error));
    }
  };

  const toggle = async (id: string) => {
    const result = await toggleFocusMicroTask(id, t);
    if (result.success) dispatch(microTaskUpserted(result.success));
    else if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
  };

  const pin = async (id: string, pinned: boolean) => {
    const result = await pinFocusMicroTask(id, pinned, t);
    if (result.success) dispatch(microTaskUpserted(result.success));
    else if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
  };

  const remove = async (id: string) => {
    const result = await deleteFocusMicroTask(id, t);
    if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
    else dispatch(microTaskRemoved({ itemGroupId, id }));
  };

  /**
   * Up and down rather than a drag handle, matching how `ListItemsEditor` reorders on this
   * platform. Both ends send the same thing — the position of each row in the array — so the web's
   * drag and this produce identical requests.
   *
   * Optimistic, unlike every other write here: a row that waits for a round trip before moving
   * reads as a button that did nothing. The server's answer replaces the guess, and a refusal puts
   * the old order straight back.
   */
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= tasks.length) return;

    const previous = tasks;
    const next = Array.from(tasks);
    [next[index], next[target]] = [next[target], next[index]];
    dispatch(microTasksLoaded({ itemGroupId, tasks: next }));

    const response = await reorderFocusMicroTasks(itemGroupId, next.map((task) => task.id), t);
    if (response.success) {
      dispatch(microTasksLoaded({ itemGroupId, tasks: response.success }));
    } else if (response.error) {
      dispatch(microTasksLoaded({ itemGroupId, tasks: previous }));
      notify.error(getFriendlyErrorMessage(t, response.error));
    }
  };

  return (
    <View testID="focus-micro-tasks">
      <Text className="text-[12.5px] font-semibold uppercase tracking-[1px] text-text-3">
        {t('FocusTasks')}
      </Text>

      <View className="mt-1.5 gap-1">
        {tasks.map((task, index) => {
          const done = isMicroTaskDone(task);
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
                onPress={() => void toggle(task.id)}
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

              {/* Only where there is somewhere to go: the first row cannot go up. */}
              {index > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('MoveUp')}
                  onPress={() => void move(index, -1)}
                  className="h-7 w-7 items-center justify-center rounded-control active:bg-surface-2"
                  testID={`focus-micro-task-up-${task.id}`}
                >
                  <ChevronUp size={14} color={theme.text3} />
                </Pressable>
              ) : null}

              {index < tasks.length - 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('MoveDown')}
                  onPress={() => void move(index, 1)}
                  className="h-7 w-7 items-center justify-center rounded-control active:bg-surface-2"
                  testID={`focus-micro-task-down-${task.id}`}
                >
                  <ChevronDown size={14} color={theme.text3} />
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={task.pinned ? t('FocusStopKeepingTask') : t('FocusKeepTask')}
                accessibilityState={{ selected: task.pinned }}
                onPress={() => void pin(task.id, !task.pinned)}
                className="h-7 w-7 items-center justify-center rounded-control active:bg-surface-2"
                testID={`focus-micro-task-pin-${task.id}`}
              >
                {task.pinned ? <Pin size={14} color={theme.accent} /> : <PinOff size={14} color={theme.text3} />}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('FocusRemoveTask')}
                onPress={() => void remove(task.id)}
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
          editable={!busy}
          onSubmitEditing={() => void submit()}
          onBlur={() => void submit()}
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
          onPress={() => setAdding(true)}
          className="mt-1.5 h-10 flex-row items-center justify-center gap-2 rounded-control border border-dashed border-border active:bg-surface-2"
          testID="focus-micro-task-add"
        >
          <Plus size={15} color={theme.text2} />
          <Text className="text-[13px] font-medium text-text-2">{t('FocusAddTask')}</Text>
        </Pressable>
      )}

      {tasks.length === 0 && !adding ? (
        <Text className="mt-2 text-center text-[12px] text-text-3">{t('FocusTasksEmpty')}</Text>
      ) : null}
    </View>
  );
}
