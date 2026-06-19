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
import { celebrationShifted } from '@beyou/state/celebration/celebrationSlice';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../store';

const AUTO_DISMISS_MS = 4000;

/**
 * Full-screen celebration for level-ups and streak milestones. Reads the head of
 * the shared celebration queue (populated by applyRefreshUi); auto-dismisses
 * after 4s and on backdrop tap. Native equivalent of the web CelebrationOverlay.
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
  const badge = isLevelUp ? `LV ${celebration.level}` : `${celebration.days}`;
  const badgeCaption = isLevelUp ? '' : t('Days');

  return (
    <Pressable
      onPress={() => dispatch(celebrationShifted())}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID="celebration-overlay"
      style={[StyleSheet.absoluteFill, styles.backdrop]}
    >
      <Animated.View
        style={cardStyle}
        className="items-center rounded-2xl border-2 border-primary bg-background px-10 py-8"
      >
        <View
          className="h-24 w-24 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.primary }}
        >
          <Text className="text-2xl font-black" style={{ color: theme.background }}>
            {badge}
          </Text>
          {badgeCaption ? (
            <Text className="text-xs font-semibold uppercase" style={{ color: theme.background }}>
              {badgeCaption}
            </Text>
          ) : null}
        </View>
        <Text className="text-primary mt-4 text-2xl font-bold">{title}</Text>
        <Text className="text-secondary mt-2 max-w-xs text-center text-sm">{message}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 60,
  },
});
