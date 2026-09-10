import { useEffect, useRef, useState } from 'react';
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
import type { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
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
import XpFloat from '../ui/dashboard/XpFloat';
import type { RootState } from '../store';
import useTodayInZone from '../ui/useTodayInZone';

/** Same lifetime as the dashboard row's float, so the two screens feel like one system. */
const XP_FLOAT_DURATION_MS = 1200;

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
  // The OWNER's day, not the UTC one: checks are stamped in the user's timezone. Re-read when
  // the day turns, which a phone left open will see.
  const today = useTodayInZone();
  const { check, skip } = useRoutineCheckin();
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The XP comes from the check RESPONSE, never from the store. `todayRoutineSlice` keeps the
  // `xpGenerated` it already had on a row and does not patch a LIST routine's `items[]`, so
  // reading it back from there showed nothing on the first check. Both pieces are keyed by
  // group id: the person can step to another item while the float is still in the air.
  const [xpFloat, setXpFloat] = useState<{ groupId: string; xp: number } | null>(null);
  const [xpEarned, setXpEarned] = useState<Record<string, number>>({});
  const floatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (floatTimer.current) clearTimeout(floatTimer.current); }, []);

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

  /**
   * A completion shows its XP twice: a float for the instant, and a chip that stays under the
   * item for as long as it is done. An undo, or a skip that cleared a check, takes the chip
   * away. A response with no item (a failed call returns null) changes nothing.
   */
  const showXp = (result: RefreshUI | null) => {
    const itemChecked = result?.refreshItemChecked;
    if (!itemChecked) return;
    const { groupItemId, check: checkResult } = itemChecked;
    if (checkResult.checked && checkResult.xpGenerated) {
      setXpEarned((previous) => ({ ...previous, [groupItemId]: checkResult.xpGenerated }));
      setXpFloat({ groupId: groupItemId, xp: checkResult.xpGenerated });
      if (floatTimer.current) clearTimeout(floatTimer.current);
      floatTimer.current = setTimeout(() => setXpFloat(null), XP_FLOAT_DURATION_MS);
      return;
    }
    setXpEarned((previous) => {
      if (!(groupItemId in previous)) return previous;
      const { [groupItemId]: _gone, ...rest } = previous;
      return rest;
    });
    // A quick undo lands while the float is still in the air, announcing XP that no longer
    // exists. Down it comes.
    setXpFloat((previous) => (previous?.groupId === groupItemId ? null : previous));
  };

  const earned = xpEarned[current.groupId];

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

        {earned !== undefined ? (
          <View className="mt-2.5">
            <Chip size="sm" variant="xp" testID="focus-ultra-xp">
              {`+${earned} XP`}
            </Chip>
          </View>
        ) : null}

        <View className="mt-4 w-full flex-row items-center justify-center gap-2.5">
          {/* The wrapper is what the float is positioned against (it sits at top:-14). */}
          <View>
            {xpFloat && xpFloat.groupId === current.groupId ? <XpFloat xp={xpFloat.xp} /> : null}
            {/* Three states, and `checked` wins when both are set, as on the dashboard row.
                A skipped item used to fall into the accent branch because the ternary only
                knew "checked or not", which read as an item still waiting to be done. */}
            <Button
              text={checked ? t('Undo') : t('Done')}
              mode={checked ? 'cancel' : skipped ? 'default' : 'primary'}
              size="medium"
              disabled={pending}
              icon={<Check size={16} color={checked || skipped ? theme.text : theme.onAccent} />}
              onPress={() =>
                guard(async () =>
                  showXp(
                    await check(groupDto<itemGroupToCheck>({}), {
                      wasChecked: checked,
                      name: found?.name,
                      motivationalPhrase:
                        found && 'motivationalPhrase' in found
                          ? (found.motivationalPhrase as string | undefined)
                          : undefined,
                    }),
                  ),
                )
              }
              testID="focus-ultra-check"
            />
          </View>
          <Button
            text={skipped ? t('Undo') : t('Skip')}
            mode="default"
            size="medium"
            disabled={pending}
            icon={<Ban size={15} color={theme.text2} />}
            onPress={() =>
              guard(async () => showXp(await skip(groupDto<itemGroupToSkip>({ skip: !skipped }))))
            }
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
