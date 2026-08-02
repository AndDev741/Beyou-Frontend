import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface SkeletonProps {
  className?: string;
  /** Altura em px quando não vier por classe. */
  height?: number;
  rounded?: 'control' | 'card' | 'full';
  testID?: string;
}

// Valores espelhados do `borderRadius` do tailwind.config.js: o bloco animado é
// estilizado por `style`, então não alcança as classes rounded-*.
const RADIUS: Record<NonNullable<SkeletonProps['rounded']>, number> = {
  control: 10,
  card: 16,
  full: 9999,
};

/**
 * Regra de sistema do mockup: o skeleton ESPELHA o cartão que substitui — não
 * existe spinner no meio do conteúdo. Spinner central fica só no gate de
 * autenticação do boot, onde ainda não há layout para espelhar.
 *
 * O shimmer da web vira pulso de opacidade aqui (gradiente animado no RN exige
 * SVG/mask e não paga o custo), desligado sob `useReducedMotion`.
 */
export default function Skeleton({ className = '', height, rounded = 'control', testID }: SkeletonProps) {
  const { theme } = useBeyouTheme();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(withTiming(0.45, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduce, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    // O bloco animado é filho: `className` do NativeWind não chega ao
    // Animated.View do reanimated, então as classes de layout ficam no wrapper.
    <View className={className} style={height ? { height } : undefined} testID={testID}>
      <Animated.View
        style={[
          { flex: 1, backgroundColor: theme.surface2, borderRadius: RADIUS[rounded] },
          animated,
        ]}
      />
    </View>
  );
}
