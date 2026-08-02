import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useBeyouTheme } from '../theme/ThemeProvider';

interface BrandMarkProps {
  size?: number;
  withWordmark?: boolean;
  /** Cor do símbolo; por padrão o acento do tema. */
  color?: string;
}

/**
 * Espelho nativo do `BrandMark` da web: anel a 83% com abertura no nordeste e
 * check apontando para ela. Mesmo desenho do check-in e do nível — se
 * divergirem, a assinatura da marca quebra.
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
