import { useEffect, type ReactNode } from 'react';
import { Text, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Card from '../ui/Card';

type BlockProps = {
  title: string;
  /** One line under the title saying what the numbers are. */
  hint?: string;
  /** Sits to the right of the title: a link, a count, a label. */
  action?: ReactNode;
  /** The one block that is asking for something gets the accent outline. */
  emphasis?: boolean;
  testID?: string;
  children: ReactNode;
};

/**
 * One section of the Second Brain screen. The title is a header, so a screen reader can
 * jump from block to block instead of walking seven of them in a row.
 */
export default function Block({ title, hint, action, emphasis = false, testID, children }: BlockProps) {
  return (
    <Card selected={emphasis} className="px-[18px] py-4" testID={testID}>
      {/* With a hint the action sits level with the title; alone, the two share a centre line. */}
      <View className={`mb-3 flex-row justify-between gap-3 ${hint ? 'items-start' : 'items-center'}`}>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-[15px] font-semibold text-text">
            {title}
          </Text>
          {hint ? <Text className="mt-1 text-[12.5px] leading-[18px] text-text-2">{hint}</Text> : null}
        </View>
        {action ? <View className="shrink-0">{action}</View> : null}
      </View>
      {children}
    </Card>
  );
}

type ShimmerProps = {
  /** One width per line, so the placeholder has the shape of what replaces it. */
  lines: DimensionValue[];
  label: string;
  testID?: string;
};

/** Text-shaped placeholder that breathes while something is being written. Still under reduced motion. */
export function Shimmer({ lines, label, testID }: ShimmerProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return undefined;
    opacity.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={[{ gap: 10 }, style]}
      testID={testID}
    >
      {lines.map((width, index) => (
        <View key={index} className="h-3.5 rounded-full bg-surface-2" style={{ width }} />
      ))}
    </Animated.View>
  );
}
