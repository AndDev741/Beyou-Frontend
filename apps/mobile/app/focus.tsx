import { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { List, Moon, Target, X } from 'lucide-react-native';
import { focusEntered, focusExited, focusModeChanged, todayInZone } from '@beyou/state';
import { useBeyouTheme } from '../src/theme/ThemeProvider';
import { useFocusRoutine } from '../src/focus/useFocusRoutine';
import RoutineDay from '../src/ui/dashboard/RoutineDay';
import Ultrafoco from '../src/focus/Ultrafoco';
import Descanso from '../src/focus/Descanso';
import IconButton from '../src/ui/IconButton';
import type { RootState, AppDispatch } from '../src/store';

/**
 * F1 of the Focus Mode: today's routine with nothing else on screen.
 *
 * Lives at the ROOT of the router, outside the `(app)` group, and that is the whole point.
 * `(app)/_layout.tsx` renders `BottomNav` as a SIBLING of the screen area rather than as an
 * overlay, so a screen inside that group is laid out above the bar and cannot cover it. Sitting
 * outside the group is the only way to get the bar off the screen without teaching the shared
 * layout which routes are allowed to hide it.
 *
 * Still gated: the root `Gate` sends an unauthenticated user to `(auth)/login` from any route
 * that is not inside `(auth)`, and this one is not. Back returns to `(app)`, which the root
 * stack holds underneath.
 *
 * The routine itself is the ordinary `RoutineDay`, so checking, skipping, XP and celebrations
 * behave identically here and on the dashboard. Same component, same call, not a copy.
 */
export default function FocusScreen() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);
  const mode = useSelector((s: RootState) => s.focus.mode);
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  const { loading, error } = useFocusRoutine();
  const isUltra = mode === 'ultrafoco';
  const isResting = mode === 'descanso';

  const leave = useCallback(() => {
    // A deep link or a cold start straight onto /focus has nothing beneath it in the stack,
    // and `back()` alone would strand the user on a screen with no way out. Same idiom the
    // section screens use.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Dispatched here, the only place that knows the screen is mounted. The mode is what the
  // routine card reads to hide its own way in, since this screen renders that same card.
  useEffect(() => {
    // The day is passed in so a pomodoro left behind is carried across only when it belongs to
    // today: see `focusEntered` in the slice.
    // In the OWNER's zone, not UTC: a timer started at 22:00 in Brazil would otherwise be filed
    // under tomorrow and dropped as stale on the very next mount.
    dispatch(focusEntered(todayInZone(timezone)));
    return () => {
      dispatch(focusExited());
    };
  }, [dispatch, timezone]);

  return (
    <SafeAreaView className="flex-1 bg-bg" testID="focus-screen">
      <View className="flex-row items-center gap-3 px-3 pb-1.5 pt-0.5">
        <Text className="text-[12.5px] font-semibold uppercase tracking-[1px] text-text-3">
          {t('FocusTitle')}
        </Text>

        {/* Three states of the same screen. No route change: the mode lives in the store
            precisely so switching keeps the selection. */}
        {routine && !isResting ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(focusModeChanged(isUltra ? 'fullscreen' : 'ultrafoco'))}
            className="ml-auto h-9 flex-row items-center gap-2 rounded-control border border-border px-3 active:bg-surface-2"
            testID="focus-mode-toggle"
          >
            {isUltra ? (
              <List size={15} color={theme.text2} />
            ) : (
              <Target size={15} color={theme.text2} />
            )}
            <Text className="text-[12.5px] font-medium text-text-2">
              {isUltra ? t('FocusWholeRoutine') : t('FocusOneAtATime')}
            </Text>
          </Pressable>
        ) : null}

        {/* Offered with or without a routine, on the user's instruction: a screen to rest is worth
            having on a day with nothing scheduled most of all. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isResting }}
          onPress={() => dispatch(focusModeChanged(isResting ? 'fullscreen' : 'descanso'))}
          className={`h-9 flex-row items-center gap-2 rounded-control border border-border px-3 active:bg-surface-2 ${
            isResting ? 'bg-surface-2' : ''
          } ${routine && !isResting ? '' : 'ml-auto'}`}
          testID="focus-rest-toggle"
        >
          <Moon size={15} color={isResting ? theme.text : theme.text2} />
          <Text
            className={`text-[12.5px] font-medium ${isResting ? 'text-text' : 'text-text-2'}`}
          >
            {isResting ? t('FocusLeaveRest') : t('FocusRest')}
          </Text>
        </Pressable>

        <IconButton
          label={t('FocusExit')}
          onPress={leave}
          className={routine ? '' : 'ml-auto'}
          testID="focus-exit"
        >
          <X size={18} color={theme.text2} />
        </IconButton>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center" testID="focus-loading">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          // `flexGrow: 1` so a child that wants the whole height (rest mode) can have it. Without
          // it the content box was the height of its text, and the rest screen came out as a
          // small card at the top with its ambient shapes clipped inside.
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 10, flexGrow: 1 }}
        >
          {/* Said inline rather than as a toast: the whole screen is what failed to load, and
              without it `RoutineDay` with no routine says "nothing scheduled today", which is
              a different and wrong claim about a day we simply could not read. */}
          {error ? (
            <View
              accessibilityRole="alert"
              className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2"
              testID="focus-error"
            >
              <Text className="text-sm text-text">{error}</Text>
            </View>
          ) : null}

          {/* Rest comes first and needs no routine at all: it is the one state of this screen
              that has nothing to do with today's list. */}
          {isResting ? (
            <Descanso />
          ) : routine || !error ? (
            isUltra && routine ? (
              <Ultrafoco routine={routine} />
            ) : (
              <RoutineDay />
            )
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
