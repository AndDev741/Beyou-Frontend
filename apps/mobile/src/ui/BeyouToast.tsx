import type { ReactNode } from 'react';
import { useContext, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Toast, { type ToastConfig, type ToastConfigParams } from 'react-native-toast-message';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import { useBeyouTheme } from '../theme/ThemeProvider';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

/** Extras que o `notify` empacota em `props`. */
export type BeyouToastProps = {
  /** Ícone da entidade — o hábito marcado, a meta concluída. */
  icon?: ReactNode;
  /** Quanto tempo a barra do tempo leva para esvaziar. */
  duration?: number;
};

export const TOAST_DURATION_MS = 4000;

/**
 * O cronômetro do mockup: 2px, sem trilho por baixo. Reanimated porque a
 * largura anima no thread de UI — o toast aparece durante uma navegação ou um
 * fetch, e uma animação no JS engasgaria justo aí.
 */
function ToastTimer({ color, duration }: { color: string; duration: number }) {
  const progress = useSharedValue(1);
  const reduce = useReducedMotion();

  useEffect(() => {
    progress.value = 1;
    if (!reduce) progress.value = withTiming(0, { duration });
  }, [duration, progress, reduce]);

  const style = useAnimatedStyle(() => ({ flex: progress.value }));

  if (reduce) return null;

  return (
    <View className="mt-2.5 h-0.5 flex-row" testID="toast-timer">
      <Animated.View style={[style, { backgroundColor: color, borderRadius: 1 }]} />
      <View className="flex-[0.0001]" />
    </View>
  );
}

function toneColor(tone: ToastTone, theme: ReturnType<typeof useBeyouTheme>['theme']): string {
  if (tone === 'success') return theme.success;
  if (tone === 'error') return theme.danger;
  if (tone === 'warning') return theme.flame;
  return theme.accent;
}

function ToneIcon({ tone, color }: { tone: ToastTone; color: string }) {
  if (tone === 'success') return <Check size={16} color={color} />;
  if (tone === 'error') return <CircleAlert size={16} color={color} />;
  if (tone === 'warning') return <TriangleAlert size={16} color={color} />;
  return <Info size={16} color={color} />;
}

/**
 * NOTIFY do mockup: borda esquerda no tom, ícone da entidade, título e um
 * subtítulo opcional. Espelha `apps/web/src/lib/notify.tsx` — inclusive a
 * regra de que o corpo fica na superfície do tema e só a barra da esquerda e o
 * ícone carregam a cor.
 */
function BeyouToast({ tone, params }: { tone: ToastTone; params: ToastConfigParams<BeyouToastProps> }) {
  const { theme } = useBeyouTheme();
  const { text1, text2, props } = params;
  const color = toneColor(tone, theme);
  const duration = props?.duration ?? TOAST_DURATION_MS;

  return (
    <View
      testID={`toast-${tone}`}
      className="w-[92%] rounded-[14px] border border-border bg-surface px-3 py-3"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <View className="flex-row items-start gap-2.5">
        <View
          className="h-8 w-8 shrink-0 items-center justify-center rounded-control"
          style={{ backgroundColor: withAlpha(color, 0.12) }}
        >
          {props?.icon ?? <ToneIcon tone={tone} color={color} />}
        </View>

        <View className="min-w-0 flex-1">
          <Text testID="toast-title" className="text-[13px] font-semibold text-text">
            {text1}
          </Text>
          {text2 ? (
            <Text testID="toast-subtitle" className="mt-0.5 text-[12px] text-text-3">
              {text2}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => Toast.hide()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="toast-close"
          className="rounded-md p-1 active:bg-surface-2"
        >
          <X size={14} color={theme.text3} />
        </Pressable>
      </View>

      <ToastTimer color={color} duration={duration} />
    </View>
  );
}

/** Passado ao `<Toast />` no layout raiz: toda notificação usa esta casca. */
export const toastConfig: ToastConfig = {
  success: (params) => <BeyouToast tone="success" params={params as ToastConfigParams<BeyouToastProps>} />,
  error: (params) => <BeyouToast tone="error" params={params as ToastConfigParams<BeyouToastProps>} />,
  info: (params) => <BeyouToast tone="info" params={params as ToastConfigParams<BeyouToastProps>} />,
  warning: (params) => <BeyouToast tone="warning" params={params as ToastConfigParams<BeyouToastProps>} />,
};

/**
 * O host que vai no layout raiz. Precisa ser um componente próprio para ler o
 * inset do topo de DENTRO do SafeAreaProvider — quem renderiza o provider não
 * enxerga o próprio contexto.
 */
export function BeyouToastHost() {
  const insets = useContext(SafeAreaInsetsContext);
  return <Toast config={toastConfig} topOffset={(insets?.top ?? 0) + 8} />;
}
