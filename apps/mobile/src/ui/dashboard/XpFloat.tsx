import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

/** "+X XP" that fades out while drifting up, over ~1.1s. Native equivalent of
 *  the web framer-motion XpFloat. The parent removes it after the duration. */
export default function XpFloat({ xp }: { xp: number }) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: reduce ? 0 : -28 * progress.value }],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', left: 0, top: -14 }, style]}
      pointerEvents="none"
      testID="xp-float"
    >
      <Text className="text-primary text-sm font-bold">+{xp} XP</Text>
    </Animated.View>
  );
}
