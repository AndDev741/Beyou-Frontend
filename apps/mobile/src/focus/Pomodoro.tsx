import { useEffect, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pause, Play, Square } from 'lucide-react-native';
import {
  BREAK_DEFAULT_MINUTES,
  clampCycleMinutes,
  suggestedMinutes,
  type FocusItem,
} from '@beyou/state';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Button from '../ui/Button';
import { usePomodoro } from './usePomodoro';

/**
 * The timer, under the item it belongs to.
 *
 * Same two rules as the web twin. The duration is pre-filled from the item's own window and
 * stays editable, because routine items already carry `startTime` and `endTime`; a LIST item
 * has no window and gets the classic 25. And there is no failure state: a finished cycle hands
 * over to a break the person has to start, stopping is plain, and only finished WORK cycles
 * count.
 */
export default function Pomodoro({ item, date }: { item: FocusItem; date: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { status, formatted, cycles, kind, start, pause, resume, stop } =
    usePomodoro(item.groupId, date);

  // Pre-filled per item, and re-offered when the person moves to another one. Held as text so
  // an empty field while typing does not become NaN under them.
  const [minutes, setMinutes] = useState(() => String(suggestedMinutes(item)));
  useEffect(() => {
    setMinutes(String(suggestedMinutes(item)));
  }, [item.groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * One timer at a time, shown wherever the person is in the focus session.
   *
   * It deliberately does NOT hide itself when the selected item is not the timer's own. Hiding
   * it meant the start control reappeared on the next item, and pressing it silently replaced
   * a cycle somebody was 18 minutes into. Showing the running cycle everywhere removes the
   * hazard: to start another one you stop this one first, on purpose.
   */
  const idle = status === 'idle';
  const typedMinutes = clampCycleMinutes(Number(minutes));

  return (
    <View
      className="rounded-card border border-border bg-surface px-4 py-4"
      testID="focus-pomodoro"
    >
      {idle ? (
        <View className="flex-row items-center justify-center gap-2.5">
          <Text className="text-[12.5px] text-text-2">{t('FocusCycleMinutes')}</Text>
          <TextInput
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            className="h-10 w-20 rounded-control border border-border bg-bg text-center font-mono text-text"
            placeholderTextColor={theme.text3}
            testID="focus-pomodoro-minutes"
          />
          <Button
            text={t('FocusStartCycle')}
            mode="primary"
            size="medium"
            icon={<Play size={15} color={theme.onAccent} />}
            onPress={() => start(typedMinutes)}
            testID="focus-pomodoro-start"
          />
        </View>
      ) : status === 'elapsed' ? (
        <View className="items-center gap-3">
          {/* Said neutrally. A cycle that ran out is a cycle that ran. */}
          <Text className="text-sm font-semibold text-text" testID="focus-pomodoro-done">
            {t('FocusCycleDone')}
          </Text>
          <View className="flex-row items-center gap-2.5">
            <Button
              text={kind === 'break' ? t('FocusStartBreak') : t('FocusStartWork')}
              mode="primary"
              size="medium"
              icon={<Play size={15} color={theme.onAccent} />}
              onPress={() =>
                start(kind === 'break' ? BREAK_DEFAULT_MINUTES : typedMinutes, kind)
              }
              testID="focus-pomodoro-next"
            />
            <Button
              text={t('FocusStop')}
              mode="default"
              size="medium"
              icon={<Square size={14} color={theme.text2} />}
              onPress={stop}
              testID="focus-pomodoro-stop"
            />
          </View>
        </View>
      ) : (
        <View className="items-center gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-text-3">
            {kind === 'break' ? t('FocusBreakCycle') : t('FocusWorkCycle')}
          </Text>
          <Text
            className={`font-mono text-4xl font-semibold ${
              status === 'paused' ? 'text-text-3' : 'text-text'
            }`}
            testID="focus-pomodoro-remaining"
          >
            {formatted}
          </Text>
          <View className="flex-row items-center gap-2.5">
            {status === 'paused' ? (
              <Button
                text={t('FocusResume')}
                mode="primary"
                size="medium"
                icon={<Play size={15} color={theme.onAccent} />}
                onPress={resume}
                testID="focus-pomodoro-resume"
              />
            ) : (
              <Button
                text={t('FocusPause')}
                mode="default"
                size="medium"
                icon={<Pause size={15} color={theme.text2} />}
                onPress={pause}
                testID="focus-pomodoro-pause"
              />
            )}
            <Button
              text={t('FocusStop')}
              mode="default"
              size="medium"
              icon={<Square size={14} color={theme.text2} />}
              onPress={stop}
              testID="focus-pomodoro-stop"
            />
          </View>
        </View>
      )}

      {cycles > 0 ? (
        <Text className="mt-3 text-center text-[12px] text-text-3" testID="focus-pomodoro-cycles">
          {t('FocusCyclesToday', { count: cycles })}
        </Text>
      ) : null}
    </View>
  );
}
