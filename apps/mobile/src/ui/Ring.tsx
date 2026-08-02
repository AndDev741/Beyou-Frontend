import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { withAlpha } from '@beyou/theme';
import { useBeyouTheme } from '../theme/ThemeProvider';

export type RingState = 'todo' | 'done' | 'skipped' | 'progress';

interface RingProps {
  /** Lado em px. */
  size?: number;
  /** 0..1 — só usado quando `state` é "progress". */
  progress?: number;
  state?: RingState;
  /** Rótulo central (nível, porcentagem). Ignorado quando há check. */
  label?: string;
  className?: string;
  /** Rótulo acessível; sem ele o anel é decorativo. */
  title?: string;
  testID?: string;
}

/**
 * Espaço de coordenadas do `BrandMark` — o check do check-in é literalmente o
 * mesmo traçado da marca. Se divergirem, a assinatura quebra.
 */
const VIEWBOX = 64;
const CHECK_PATH = 'M22 33l7 7 14-14';
const CROSS_PATH = 'M25 25l14 14M39 25l-14 14';

/**
 * O anel do sistema: check-in, nível, progresso do dia e logo são a MESMA peça.
 *
 * O traço acompanha o tamanho — um anel de 20px com traço fixo de 3 vira uma
 * bolha; um de 96 com o mesmo traço vira um fio.
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

  // Traço calculado em px (mesma regra da web) e convertido para o viewBox de
  // 64, que é o espaço do BrandMark.
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
          // Contraste conferido nos dois temas: borda em text-3 e ícone em
          // text-2 (com o ícone em text-3 ele sumia no escuro).
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
