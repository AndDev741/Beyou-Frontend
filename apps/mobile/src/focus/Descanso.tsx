import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { holdScreenAwake, releaseScreenAwake } from './keepAwake';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { formatTime, getFocusItems, minutesOfDay, resolveFocusStart } from '@beyou/state';
import type { RootState } from '../store';
import useTodayInZone from '../ui/useTodayInZone';

const KEEP_AWAKE_TAG = 'beyou-focus-rest';

/** How long without a touch before the screen fades itself down. */
const DIM_AFTER_MS = 25_000;
/** What it fades to. Low enough to stop being a light source, high enough to still read. */
const DIM_OPACITY = 0.32;

/**
 * Rest mode on native: a screen worth leaving on the desk.
 *
 * Reached by its own button rather than automatically, and offered with or without a routine — the
 * user asked for that, and it is also the honest arrangement: deciding somebody is idle and taking
 * their screen is not a decision an app should make.
 *
 * No new art. Three soft blooms of `accent` and `xp` at low alpha, each on its own long offset
 * path, so it follows all nine themes. Reanimated rather than RN's `Animated` on purpose: an
 * infinite `Animated` loop leaves timers that never settle under jest (the same trouble the toast
 * host had), while reanimated is mocked to no-ops in `jest.setup.js`. `useReducedMotion` is
 * respected — with it on, the blooms are placed and left still.
 *
 * The clock ticks on the MINUTE, not the second. A second hand is something to watch, and this is
 * the one screen whose job is to be ignorable.
 */
export default function Descanso() {
  const { t } = useTranslation();
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);
  const allHabits = useSelector((s: RootState) => s.habits.habits);
  const allTasks = useSelector((s: RootState) => s.tasks.tasks);
  const reduceMotion = useReducedMotion();

  const [now, setNow] = useState(() => new Date());
  // The owner's day, re-read at midnight. `toJSON()` would give the UTC one.
  const today = useTodayInZone();
  const [dimmed, setDimmed] = useState(false);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aligned to the next minute boundary, so the digits change when the clock does rather than up
  // to 59 seconds late.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = new Date();
      setNow(current);
      const msToNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
      timeout = setTimeout(schedule, msToNextMinute);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  const wake = useCallback(() => {
    setDimmed(false);
    if (dimTimer.current) clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => setDimmed(true), DIM_AFTER_MS);
  }, []);

  useEffect(() => {
    wake();
    return () => {
      if (dimTimer.current) clearTimeout(dimTimer.current);
    };
  }, [wake]);

  // The whole point of a rest screen is that it stays lit. Released on unmount, so leaving rest
  // does not hold the display awake behind the person's back.
  useEffect(() => {
    void holdScreenAwake(KEEP_AWAKE_TAG);
    return () => {
      releaseScreenAwake(KEEP_AWAKE_TAG);
    };
  }, []);

  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withTiming(1, { duration: 34_000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduceMotion, drift]);

  const bloomA = useAnimatedStyle(() => ({
    transform: [
      { translateX: -20 + drift.value * 40 },
      { translateY: -16 + drift.value * 32 },
      { scale: 1 + drift.value * 0.18 },
    ],
  }));
  const bloomB = useAnimatedStyle(() => ({
    transform: [
      { translateX: 18 - drift.value * 44 },
      { translateY: 22 - drift.value * 36 },
      { scale: 1.12 - drift.value * 0.12 },
    ],
  }));
  const clockBreath = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + drift.value * 0.015 }],
  }));

  /** The next thing with a time, when there is one. Read-only: rest never checks anything. */
  const next = useMemo(() => {
    const items = getFocusItems(routine);
    if (items.length === 0) return null;
    const resolved = resolveFocusStart(items, minutesOfDay(now), today);
    if (resolved.index < 0) return null;
    const item = items[resolved.index];
    const found =
      item.type === 'habit'
        ? allHabits?.find((habit) => habit.id === item.itemId)
        : allTasks?.find((task) => task.id === item.itemId);
    return {
      name: found?.name ?? item.itemId,
      startTime: item.startTime,
      reason: resolved.reason,
    };
  }, [routine, allHabits, allTasks, now, today]);

  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('FocusRest')}
      onPress={wake}
      style={{ opacity: dimmed ? DIM_OPACITY : 1 }}
      className="flex-1 items-center justify-center overflow-hidden rounded-card"
      testID="focus-descanso"
    >
      {/* Behind everything and inert: decoration must never eat a tap. */}
      <View className="absolute inset-0" pointerEvents="none">
        <Animated.View
          style={bloomA}
          className="absolute -left-16 -top-16 h-56 w-72 rounded-full bg-accent/20"
        />
        <Animated.View
          style={bloomB}
          className="absolute -bottom-20 -right-14 h-60 w-64 rounded-full bg-accent/15"
        />
        <View className="absolute left-12 top-1/3 h-44 w-48 rounded-full bg-xp/10" />
      </View>

      <Animated.Text
        style={clockBreath}
        className="font-mono text-[76px] font-bold text-text"
        testID="focus-descanso-clock"
      >
        {clock}
      </Animated.Text>

      {next ? (
        <View className="mt-4 items-center" testID="focus-descanso-next">
          <Text className="text-sm font-medium text-text-2">{next.name}</Text>
          {next.startTime && next.reason !== 'order' ? (
            <Text className="mt-0.5 font-mono text-[12.5px] text-text-3">
              {t('FocusNextAt', { time: formatTime(next.startTime) })}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text className="mt-4 text-sm text-text-3" testID="focus-descanso-empty">
          {t('FocusRestNothingScheduled')}
        </Text>
      )}

      {dimmed ? (
        <Text className="mt-6 text-[12px] text-text-3" testID="focus-descanso-hint">
          {t('FocusRestHint')}
        </Text>
      ) : null}
    </Pressable>
  );
}
