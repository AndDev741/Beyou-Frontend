import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'expo-router';
import { Pause, Timer } from 'lucide-react-native';
import { CYCLE_LABEL_KEY, formatRemaining, remainingMs, timerStatus } from '@beyou/state';
import { useBeyouTheme } from '../theme/ThemeProvider';
import type { RootState } from '../store';

/**
 * The floating "a cycle is still running" hub, on native.
 *
 * Closes the gap F3 left open: `focusExited` keeps the timer on purpose, so leaving the screen
 * mid-cycle does not kill a pomodoro somebody is 18 minutes into — but nothing said so and nothing
 * led back. A timer running invisibly is worse than no timer at all.
 *
 * Read-only. It shows the clock and routes back; it does NOT dispatch the cycle completion that
 * `usePomodoro` owns, so the two never race and nothing here arms keep-awake or a notification a
 * second time.
 *
 * Mounted in the `(app)` layout, so it rides every authenticated screen in the group. The focus
 * screen itself lives OUTSIDE that group (see `app/focus.tsx`), so it never has to hide from it —
 * unlike the web twin, which shares one shell with the route.
 */
export default function RunningTimerHub() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const router = useRouter();
  const pathname = usePathname();
  const timer = useSelector((s: RootState) => s.focus.timer);
  const [now, setNow] = useState(() => Date.now());

  const status = timerStatus(timer, now);
  /*
   * Belt and braces: `app/focus.tsx` sits outside the `(app)` group, so this layout does not render
   * there at all. The guard means moving the screen back into the group cannot resurrect a hub on
   * top of the real panel.
   *
   * `usePathname` and not `useSegments`, matching the web twin's plain path comparison — and route
   * groups are filtered out of the pathname, so `/focus` is `/focus` wherever the file lives.
   */
  const visible = pathname !== '/focus' && (status === 'running' || status === 'paused');

  // Only while it counts. A paused cycle needs no tick: its number is frozen by definition.
  useEffect(() => {
    if (status !== 'running' || !visible) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, visible]);

  if (!visible || !timer) return null;

  const paused = status === 'paused';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('FocusRunningHub')}
      onPress={() => router.push('/focus')}
      /*
       * Bottom centre, lifted clear of the bar the layout renders below the screen area. `absolute`
       * within the layout's column rather than the screen's, so it floats over whatever screen is
       * mounted.
       */
      className="absolute bottom-24 left-0 right-0 z-50 flex-row items-center justify-center"
      testID="focus-running-hub"
    >
      <View className="flex-row items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5">
        <View
          className={`h-7 w-7 items-center justify-center rounded-full ${
            paused ? 'bg-surface-2' : 'bg-accent'
          }`}
        >
          {paused ? (
            <Pause size={14} color={theme.text2} />
          ) : (
            <Timer size={14} color={theme.onAccent} />
          )}
        </View>

        <View>
          <Text
            className={`font-mono text-[15px] font-semibold ${paused ? 'text-text-3' : 'text-text'}`}
            testID="focus-running-hub-remaining"
          >
            {formatRemaining(remainingMs(timer, now))}
          </Text>
          <Text
            className="text-[10.5px] font-medium uppercase tracking-[1px] text-text-3"
            testID="focus-running-hub-kind"
          >
            {paused ? t('FocusPause') : t(CYCLE_LABEL_KEY[timer.kind])}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
