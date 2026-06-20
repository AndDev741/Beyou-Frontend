import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface ProgressRingProps {
  /** 0-100; clamped. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  sublabel?: string;
  testID?: string;
}

/**
 * Circular progress ring (react-native-svg) — the native equivalent of the web
 * SVG ProgressRing. Theme-colored: muted track + primary arc. Used in the
 * profile header to show level XP progress.
 */
export default function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 6,
  centerLabel,
  sublabel,
  testID,
}: ProgressRingProps) {
  const { theme } = useBeyouTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={theme.placeholder} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {(centerLabel || sublabel) && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {centerLabel ? <Text className="text-secondary text-lg font-bold">{centerLabel}</Text> : null}
          {sublabel ? <Text className="text-description text-[10px] font-semibold uppercase">{sublabel}</Text> : null}
        </View>
      )}
    </View>
  );
}
