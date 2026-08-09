import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import { celebrationShifted } from '@beyou/state/celebration/celebrationSlice';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import Ring from '../Ring';
import type { RootState, AppDispatch } from '../../store';

const AUTO_DISMISS_MS = 4000;

/**
 * The mockup's celebration: the system ring filled, with the level number in the
 * centre — the same piece as the check-in and the brand. A streak milestone uses the
 * same ring with the flame and the day count.
 *
 * Reads the head of the celebration queue (filled by applyRefreshUi). It closes
 * itself after 4s, on a backdrop tap and on "Continue" — the button is an early
 * exit, not the only one. Mirrors the web's CelebrationOverlay.
 */
export default function CelebrationOverlay() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();
  const reduce = useReducedMotion();
  const celebration = useSelector((s: RootState) => s.celebration.queue[0] ?? null);

  const scale = useSharedValue(reduce ? 1 : 0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!celebration) return;
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = reduce ? 1 : withSpring(1, { stiffness: 260, damping: 18 });
    const timer = setTimeout(() => dispatch(celebrationShifted()), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [celebration, dispatch, opacity, scale, reduce]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  if (!celebration) return null;

  const isLevelUp = celebration.kind === 'levelUp';
  const title = isLevelUp ? t('LevelUpTitle') : t('StreakMilestoneTitle', { days: celebration.days });
  const message = isLevelUp
    ? t('LevelUpMessage', { level: celebration.level })
    : t('StreakMilestoneMessage', { days: celebration.days });
  const dismiss = () => dispatch(celebrationShifted());

  return (
    <Pressable
      onPress={dismiss}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID="celebration-overlay"
      style={[StyleSheet.absoluteFill, styles.backdrop]}
    >
      <Animated.View
        style={cardStyle}
        className="w-full max-w-[340px] items-center rounded-card border border-border bg-surface px-7 py-8"
      >
        <View className="h-[104px] w-[104px] items-center justify-center">
          {/* Halo: the filled ring is the message, the glow only backs it. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              height: 104,
              width: 104,
              borderRadius: 52,
              backgroundColor: withAlpha(theme.accent, 0.1),
            }}
          />
          {isLevelUp ? (
            <Ring size={96} state="progress" progress={1} label={String(celebration.level)} testID="celebration-ring" />
          ) : (
            <View className="h-24 w-24 items-center justify-center">
              <Ring size={96} state="progress" progress={1} className="absolute" testID="celebration-ring" />
              <View className="items-center gap-0.5">
                <Flame size={18} color={theme.flame} />
                <Text className="font-mono-semibold text-[22px] text-text">{celebration.days}</Text>
              </View>
            </View>
          )}
        </View>

        <Text className="mt-5 text-center text-[19px] font-semibold text-text">{title}</Text>
        <Text className="mt-2 max-w-[15rem] text-center text-[13px] text-text-3">{message}</Text>

        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          testID="celebration-continue"
          className="mt-6 w-full items-center rounded-control bg-accent px-5 py-2.5 active:opacity-80"
        >
          <Text className="text-sm font-semibold" style={{ color: theme.onAccent }}>
            {t('Continue')}
          </Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 60,
  },
});
