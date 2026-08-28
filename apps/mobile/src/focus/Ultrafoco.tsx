import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
// Ban (a crossed circle) and not the bare stroke: it is the skip glyph the routine rows
// already use in `RoutineItem.tsx`, and the web side draws the same shape through
// react-icons' FiSlash.
import { Ban, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { Routine } from '@beyou/types/routine/routine';
import type { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import type { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';
import {
  FOCUS_REASON_LABEL_KEY,
  formatTimeRange,
  isFocusItemChecked,
  isFocusItemSkipped,
  reasonIsFromClock,
  type FocusItem,
} from '@beyou/state';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { useRoutineCheckin } from '../dashboard/useRoutineCheckin';
import { useFocusSelection } from './useFocusSelection';
import Pomodoro from './Pomodoro';
import BeyouIcon from '../ui/BeyouIcon';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import IconButton from '../ui/IconButton';
import type { RootState } from '../store';

/**
 * One item at a time, on native.
 *
 * The freedom rule shapes the whole component, same as on web. The clock seeds which item
 * opens and then has no further say: the arrows and the picker work in both directions at any
 * hour, a passed window is still reachable, and an item whose window has not arrived can be
 * checked right now. No disabled state anywhere depends on the time, and nothing warns that
 * this is the wrong moment.
 *
 * It costs nothing on the server: `CheckItemService` resolves a check by group id and stamps
 * the owner's local day, and never reads the `startTime` the DTO carries.
 */
export default function Ultrafoco({ routine }: { routine: Routine }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const today = useMemo(() => new Date().toJSON().slice(0, 10), []);
  const { check, skip } = useRoutineCheckin();
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const allHabits = useSelector((s: RootState) => s.habits.habits);
  const allTasks = useSelector((s: RootState) => s.tasks.tasks);

  const { items, current, index, reason, select, next, previous, canGoNext, canGoPrevious } =
    useFocusSelection(routine, today);

  const resolve = (item: FocusItem) =>
    item.type === 'habit'
      ? allHabits?.find((habit) => habit.id === item.itemId)
      : allTasks?.find((task) => task.id === item.itemId);

  if (items.length === 0) {
    return (
      <View
        className="rounded-card border border-border bg-surface px-4 py-10"
        testID="focus-ultra-empty"
      >
        <Text className="text-center text-base font-semibold text-text">
          {t('FocusNothingHere')}
        </Text>
        <Text className="mt-1 text-center text-sm text-text-3">{t('FocusNothingHereHint')}</Text>
      </View>
    );
  }

  if (!current) {
    // Everything checked or skipped. Said as an accomplishment, with no "but you skipped
    // three of them" attached.
    return (
      <View
        className="rounded-card border border-border bg-surface px-4 py-10"
        testID="focus-ultra-done"
      >
        <Text className="text-center text-base font-semibold text-text">{t('FocusDayDone')}</Text>
        <Text className="mt-1 text-center text-sm text-text-3">{t('FocusDayDoneHint')}</Text>
      </View>
    );
  }

  const found = resolve(current);
  const checked = isFocusItemChecked(current, today);
  const skipped = isFocusItemSkipped(current, today);
  const window = formatTimeRange(current.startTime, current.endTime);

  const groupDto = <T extends itemGroupToCheck | itemGroupToSkip>(extra: Partial<T>): T =>
    ({
      routineId: routine.id ?? '',
      ...(current.type === 'task'
        ? // `startTime` is required by the type but never read by the server: the check
          // resolves the group by id. A LIST item has no time at all, hence the ''.
          { taskGroupDTO: { taskGroupId: current.groupId, startTime: current.startTime ?? '' } }
        : { habitGroupDTO: { habitGroupId: current.groupId, startTime: current.startTime ?? '' } }),
      ...extra,
    }) as T;

  /** One call in flight at a time: a double press granted then revoked the XP. */
  const guard = async (run: () => Promise<unknown>) => {
    if (pending) return;
    setPending(true);
    try {
      await run();
    } finally {
      setPending(false);
    }
  };

  return (
    <View className="gap-2.5" testID="focus-ultra">
      {/* The day's counter and the jump list come FIRST, right under the screen's title and
          its actions: "which of the day am I on" is the orientation question, and it belongs
          above the item rather than buried under it. */}
      <View className="flex-row items-center gap-2">
        <IconButton
          label={t('FocusPreviousItem')}
          onPress={previous}
          disabled={!canGoPrevious}
          className="h-10 w-10 rounded-control border border-border"
          testID="focus-ultra-prev"
        >
          <ChevronLeft size={18} color={theme.text2} />
        </IconButton>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('FocusJumpTo')}
          onPress={() => setPickerOpen((open) => !open)}
          className="h-10 flex-1 items-center justify-center rounded-control border border-border active:bg-surface-2"
          testID="focus-ultra-picker-toggle"
        >
          <Text className="text-[12.5px] font-medium text-text-2">
            {`${index + 1} ${t('Of')} ${items.length}`}
          </Text>
        </Pressable>

        <IconButton
          label={t('FocusNextItem')}
          onPress={next}
          disabled={!canGoNext}
          className="h-10 w-10 rounded-control border border-border"
          testID="focus-ultra-next"
        >
          <ChevronRight size={18} color={theme.text2} />
        </IconButton>
      </View>

      {/* Any item of the day, in one tap, in any direction. This is what makes the freedom
          rule real rather than stated: without it, reaching this morning at eleven at night
          means pressing back eleven times. */}
      {pickerOpen ? (
        <ScrollView
          className="max-h-72 rounded-card border border-border bg-surface"
          contentContainerStyle={{ padding: 6 }}
          testID="focus-ultra-picker"
        >
          {items.map((item, itemIndex) => {
            const itemFound = resolve(item);
            const done = isFocusItemChecked(item, today) || isFocusItemSkipped(item, today);
            return (
              <Pressable
                key={item.groupId}
                accessibilityRole="button"
                accessibilityState={{ selected: itemIndex === index }}
                onPress={() => {
                  select(itemIndex);
                  setPickerOpen(false);
                }}
                className={`flex-row items-center gap-2.5 rounded-control px-2.5 py-2 active:bg-surface-2 ${
                  itemIndex === index ? 'bg-surface-2' : ''
                }`}
                testID={`focus-ultra-pick-${item.groupId}`}
              >
                <BeyouIcon id={itemFound?.iconId ?? ''} size={16} />
                <Text
                  className={`flex-1 text-[13px] ${done ? 'text-text-3 line-through' : 'text-text'}`}
                  numberOfLines={1}
                >
                  {itemFound?.name ?? item.itemId}
                </Text>
                {item.startTime ? (
                  <Text className="font-mono text-[11px] text-text-3">
                    {formatTimeRange(item.startTime, item.endTime)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View className="items-center rounded-card border border-border bg-surface px-4 py-4">
        <View className="flex-row items-center gap-2">
          <Chip size="sm" testID="focus-ultra-reason">
            {t(FOCUS_REASON_LABEL_KEY[reason])}
          </Chip>
          {current.sectionName ? (
            <Text className="text-[11px] text-text-3">{current.sectionName}</Text>
          ) : null}
        </View>

        <View className="mt-3">
          <BeyouIcon id={found?.iconId ?? ''} size={44} />
        </View>

        <Text className="mt-2 text-center text-xl font-semibold tracking-[-0.01em] text-text">
          {found?.name ?? current.itemId}
        </Text>

        {/* A time only when there is one, and only when the clock is what put this item on
            screen. Over a LIST item it would invent a schedule. */}
        <Text className="mt-1 font-mono text-[12.5px] text-text-3" testID="focus-ultra-window">
          {window && reasonIsFromClock(reason) ? window : t('FocusAnyTime')}
        </Text>

        {found && 'motivationalPhrase' in found && found.motivationalPhrase ? (
          <Text className="mt-2.5 text-center text-sm text-text-2">
            {String(found.motivationalPhrase)}
          </Text>
        ) : null}

        <View className="mt-4 w-full flex-row items-center justify-center gap-2.5">
          <Button
            text={checked ? t('Undo') : t('Done')}
            mode={checked ? 'cancel' : 'primary'}
            size="medium"
            disabled={pending}
            icon={<Check size={16} color={checked ? theme.text : theme.onAccent} />}
            onPress={() => guard(() => check(groupDto<itemGroupToCheck>({}), {
              wasChecked: checked,
              name: found?.name,
              motivationalPhrase:
                found && 'motivationalPhrase' in found
                  ? (found.motivationalPhrase as string | undefined)
                  : undefined,
            }))}
            testID="focus-ultra-check"
          />
          <Button
            text={skipped ? t('Undo') : t('Skip')}
            mode="default"
            size="medium"
            disabled={pending}
            icon={<Ban size={15} color={theme.text2} />}
            onPress={() => guard(() => skip(groupDto<itemGroupToSkip>({ skip: !skipped })))}
            testID="focus-ultra-skip"
          />
        </View>
      </View>

      {/* Between the item and the navigation, so starting a cycle and then stepping to another
          item reads as two separate acts. */}
      <Pomodoro item={current} date={today} />

    </View>
  );
}
