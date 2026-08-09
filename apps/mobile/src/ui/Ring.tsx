import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { withAlpha } from '@beyou/theme';
import { useBeyouTheme } from '../theme/ThemeProvider';

export type RingState = 'todo' | 'done' | 'skipped' | 'progress';

interface RingProps {
  /** Side in px. */
  size?: number;
  /** 0..1 — only used when `state` is "progress". */
  progress?: number;
  state?: RingState;
  /** Centre label (level, percentage). Ignored when a check is drawn. */
  label?: string;
  className?: string;
  /** Accessible label; without one the ring is decorative. */
  title?: string;
  testID?: string;
}

/**
 * `BrandMark`'s coordinate space — the check-in tick is literally the same path
 * as the brand's. If they drift apart, the signature breaks.
 */
const VIEWBOX = 64;
const CHECK_PATH = 'M22 33l7 7 14-14';
const CROSS_PATH = 'M25 25l14 14M39 25l-14 14';

/**
 * The system's ring: check-in, level, day progress and the logo are the SAME
 * piece.
 *
 * The stroke follows the size — a 20px ring with a fixed stroke of 3 turns into a
 * blob; a 96px one with the same stroke turns into a thread.
 */
export default function Ring({
  size = 24,
  progress = 0,
  state = 'todo',
  label,
  className = '',
  title,
  testID,
}: RingProps) {
  const { theme } = useBeyouTheme();

  // Stroke computed in px (same rule as the web) and converted into the 64
  // viewBox, which is BrandMark's space.
  const strokePx = Math.max(2, Math.round(size * 0.11));
  const stroke = (strokePx * VIEWBOX) / size;
  const radius = (VIEWBOX - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const filled = state === 'done' ? 1 : clamped;

  const trackColor = state === 'skipped' ? withAlpha(theme.text3, 0.4) : theme.border;
  const valueColor = state === 'skipped' ? theme.text3 : theme.accent;
  const showArc = state === 'done' || state === 'progress';

  return (
    <View
      testID={testID}
      accessible={!!title}
      accessibilityLabel={title}
      className={`shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <Circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {showArc && (
          <Circle
            testID={testID ? `${testID}-arc` : undefined}
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={radius}
            fill="none"
            stroke={valueColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
          />
        )}
        {state === 'done' && (
          <Path
            testID={testID ? `${testID}-check` : undefined}
            d={CHECK_PATH}
            fill="none"
            stroke={theme.accent}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {state === 'skipped' && (
          // Contrast checked in both themes: border in text-3 and icon in
          // text-2 (with the icon in text-3 it vanished in the dark).
          <Path
            testID={testID ? `${testID}-cross` : undefined}
            d={CROSS_PATH}
            fill="none"
            stroke={theme.text2}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {label && state === 'progress' && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text
            className="font-mono-semibold text-text"
            style={{ fontSize: Math.max(9, Math.round(size * 0.26)) }}
          >
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}
