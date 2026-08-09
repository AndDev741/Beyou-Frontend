import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface BrandMarkProps {
  size?: number;
  withWordmark?: boolean;
  /** The mark's colour; the theme's accent by default. */
  color?: string;
}

/**
 * The native mirror of the web's `BrandMark`: a ring at 83% with the gap to the
 * north-east and a check pointing at it. Same drawing as the check-in and the level —
 * if they drift apart, the brand's signature breaks.
 */
export default function BrandMark({ size = 32, withWordmark = false, color }: BrandMarkProps) {
  const { theme } = useBeyouTheme();
  const tint = color ?? theme.accent;
  const isSmall = size < 20;
  const stroke = isSmall ? 11 : 8;
  const radius = isSmall ? 23 : 24;
  const dash = isSmall ? '118 26.5' : '125 25.8';
  const check = isSmall ? 'M21 33l8 8 15-15' : 'M22 33l7 7 14-14';

  return (
    <View className="flex-row items-center" style={{ gap: 10 }} accessibilityLabel="beyou">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
        <Path
          d={check}
          fill="none"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {withWordmark && (
        <Text style={{ color: tint, fontSize: Math.round(size * 0.86) }} className="font-semibold">
          beyou
        </Text>
      )}
    </View>
  );
}
